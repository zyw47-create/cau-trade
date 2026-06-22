from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
import uuid
from dataclasses import dataclass

from .config import AppConfig


_config: AppConfig | None = None
_fail_count = 0
_opened_until = 0.0

BUILTIN_REJECT_KEYWORDS = [
    "校园贷",
    "裸贷",
    "网贷",
    "高利贷",
    "借贷",
    "贷款",
    "套现",
    "网赌",
    "赌博",
    "博彩",
    "代考",
    "替考",
    "代写",
    "论文代写",
    "买答案",
    "卖答案",
    "枪手",
    "刷单",
    "诈骗",
    "洗钱",
    "毒品",
    "大麻",
    "冰毒",
    "迷药",
    "涉黄",
    "色情",
    "裸聊",
]


@dataclass
class AuditResult:
    provider: str
    risk_level: str
    reason: str
    request_id: str
    raw_result: dict
    generated: dict


class DeepSeekAdapter:
    def __init__(self, config: AppConfig):
        self.config = config

    def chat(self, messages: list[dict], response_format: dict | None = None) -> dict:
        if not self.config.deepseek_api_key:
            raise RuntimeError("DEEPSEEK_API_KEY is not configured")
        url = self.config.deepseek_base_url.rstrip("/") + "/chat/completions"
        body = {
            "model": self.config.deepseek_model,
            "messages": messages,
            "temperature": 0.2,
        }
        if response_format:
            body["response_format"] = response_format
        request = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.config.deepseek_api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=self.config.deepseek_timeout_seconds) as response:
            return json.loads(response.read().decode("utf-8"))


def adapter() -> DeepSeekAdapter:
    return DeepSeekAdapter(config())


def configure_ai(config: AppConfig) -> None:
    global _config, _fail_count, _opened_until
    _config = config
    _fail_count = 0
    _opened_until = 0.0


def config() -> AppConfig:
    if _config is None:
        raise RuntimeError("ai gateway is not configured")
    return _config


def circuit_state() -> str:
    if time.time() < _opened_until:
        return "open"
    return "closed"


def _mark_success() -> None:
    global _fail_count, _opened_until
    _fail_count = 0
    _opened_until = 0.0


def _mark_failure() -> None:
    global _fail_count, _opened_until
    cfg = config()
    _fail_count += 1
    if _fail_count >= cfg.ai_circuit_fail_threshold:
        _opened_until = time.time() + cfg.ai_circuit_reset_seconds


def _rule_keywords(rule: dict | None) -> list[str]:
    if not rule:
        return []
    raw = str(rule.get("keywords") or "")
    return [item.strip() for item in raw.replace(";", ",").replace("|", ",").split(",") if item.strip()]


def _compact_text(value: str) -> str:
    return "".join(ch for ch in str(value or "").lower() if not ch.isspace())


def _normalized_tags(value) -> list[str]:
    if isinstance(value, str):
        items = value.replace(";", ",").replace("|", ",").split(",")
    elif isinstance(value, list):
        items = value
    else:
        items = []
    tags: list[str] = []
    seen = set()
    for item in items:
        text = str(item or "").strip()[:24]
        key = text.lower()
        if not text or key in seen:
            continue
        seen.add(key)
        tags.append(text)
        if len(tags) >= 8:
            break
    return tags


def _normalized_generated(parsed: dict) -> dict:
    return {
        "title": str(parsed.get("title_suggestion") or parsed.get("title") or "")[:100],
        "description": str(parsed.get("description_suggestion") or parsed.get("description") or "")[:1000],
        "tags": _normalized_tags(parsed.get("tags")),
    }


def _looks_like_normal_listing_text(text: str) -> bool:
    value = str(text or "")
    chinese = re.findall(r"[\u4e00-\u9fff]", value)
    letters = re.findall(r"[A-Za-z]", value)
    digits = re.findall(r"\d", value)
    question_marks = value.count("?") + value.count("？")
    meaningful_count = len(chinese) + len(letters) + len(digits)
    if meaningful_count < 8:
        return False
    if question_marks >= 3 and question_marks >= meaningful_count:
        return False
    return True


def _is_low_quality_false_positive(reason: str) -> bool:
    lowered = str(reason or "").lower()
    markers = [
        "garbled",
        "empty",
        "spam",
        "nonsensical",
        "invalid content",
        "valid product listing",
        "cannot determine",
        "question mark",
    ]
    return any(marker in lowered for marker in markers)


def rule_audit(text: str, rule: dict | None = None) -> AuditResult:
    keywords = _rule_keywords(rule)
    manual_level = (rule or {}).get("manual_risk_level") or "manual"
    lowered = _compact_text(text)
    builtin_hits = [word for word in BUILTIN_REJECT_KEYWORDS if word and _compact_text(word) in lowered]
    hits = [word for word in keywords if word and _compact_text(word) in lowered]
    if builtin_hits:
        risk = "reject"
        reason = "builtin forbidden keyword hit: " + ", ".join(builtin_hits[:5])
    elif hits:
        risk = manual_level if manual_level in {"manual", "reject"} else "manual"
        reason = "keyword hit: " + ", ".join(hits[:5])
    else:
        risk = "pass"
        reason = "rule audit passed"
    return AuditResult(
        provider="rule",
        risk_level=risk,
        reason=reason,
        request_id="rule-" + uuid.uuid4().hex,
        raw_result={"keywords": hits, "builtin_keywords": builtin_hits, "circuit": circuit_state()},
        generated={},
    )


def _local_image_metadata_audit(image_urls: list[str], rule: dict | None = None, error: str = "") -> AuditResult:
    suspicious = [
        url
        for url in image_urls
        if any(
            marker in str(url).lower()
            for marker in [
                "forbidden",
                "violation",
                "danger",
                "blocked",
                "porn",
                "nude",
                "weapon",
                "knife",
                "drug",
                "gambling",
            ]
        )
    ]
    risk = "manual" if suspicious else "pass"
    reason = "image metadata risk marker detected" if suspicious else "image metadata audit passed"
    raw_result = {
        "imageAuditEnabled": True,
        "imageCount": len(image_urls),
        "suspicious": suspicious[:5],
        "externalImageProvider": False,
    }
    if error:
        raw_result["providerError"] = error
    return AuditResult(
        provider="rule_image_metadata",
        risk_level=risk,
        reason=reason,
        request_id="img-rule-" + uuid.uuid4().hex,
        raw_result=raw_result,
        generated={},
    )


def _external_image_audit(image_urls: list[str]) -> AuditResult:
    cfg = config()
    body = {"images": image_urls}
    headers = {"Content-Type": "application/json"}
    if cfg.image_audit_api_key:
        headers["Authorization"] = f"Bearer {cfg.image_audit_api_key}"
    request = urllib.request.Request(
        cfg.image_audit_endpoint,
        data=json.dumps(body).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=cfg.image_audit_timeout_seconds) as response:
        parsed = json.loads(response.read().decode("utf-8"))
    risk = str(parsed.get("risk_level") or parsed.get("riskLevel") or "manual").lower()
    if risk not in {"pass", "manual", "reject"}:
        risk = "manual"
    return AuditResult(
        provider=str(parsed.get("provider") or "external_image"),
        risk_level=risk,
        reason=str(parsed.get("reason") or "external image audit completed")[:255],
        request_id=str(parsed.get("request_id") or parsed.get("requestId") or "img-" + uuid.uuid4().hex),
        raw_result={"externalImageProvider": True, "response": parsed},
        generated={},
    )


def image_audit(image_urls: list[str], rule: dict | None = None) -> AuditResult:
    text_enabled = int((rule or {}).get("text_audit_enabled", 1) or 0)
    image_enabled = int((rule or {}).get("image_audit_enabled", 1) or 0)
    if not image_enabled:
        return AuditResult(
            provider="rule",
            risk_level="pass",
            reason="image audit disabled",
            request_id="img-rule-" + uuid.uuid4().hex,
            raw_result={"imageAuditEnabled": False, "imageCount": len(image_urls), "textAuditEnabled": bool(text_enabled)},
            generated={},
        )
    cfg = config()
    if cfg.ai_enabled and cfg.image_audit_endpoint and circuit_state() != "open":
        try:
            result = _external_image_audit(image_urls)
            _mark_success()
            return result
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError, OSError, ValueError) as exc:
            _mark_failure()
            return _local_image_metadata_audit(image_urls, rule, str(exc))
    return _local_image_metadata_audit(image_urls, rule)


def _deepseek_chat(messages: list[dict], response_format: dict | None = None) -> dict:
    return adapter().chat(messages, response_format)


def ai_audit(text: str, rule: dict | None = None) -> AuditResult:
    cfg = config()
    precheck = rule_audit(text, rule)
    if precheck.risk_level != "pass":
        return precheck
    if not cfg.ai_enabled or not cfg.deepseek_api_key or circuit_state() == "open":
        return precheck
    request_id = "ds-" + uuid.uuid4().hex
    prompt = (
        "You are the safety and quality auditor for a campus second-hand trading "
        "mini-program. Return strict JSON with keys risk_level(pass/manual/reject), "
        "reason, title_suggestion, description_suggestion, and tags."
    )
    try:
        result = _deepseek_chat(
            [
                {"role": "system", "content": prompt},
                {"role": "user", "content": text[:6000]},
            ],
            response_format={"type": "json_object"},
        )
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "{}")
        parsed = json.loads(content)
        risk = str(parsed.get("risk_level") or "manual").lower()
        if risk not in {"pass", "manual", "reject"}:
            risk = "manual"
        reason = str(parsed.get("reason") or "AI audit completed")[:255]
        if risk == "reject" and _is_low_quality_false_positive(reason) and _looks_like_normal_listing_text(text):
            risk = "pass"
            parsed["local_quality_override"] = True
            reason = "AI low-quality rejection overridden after local Chinese text quality check"
        _mark_success()
        return AuditResult(
            provider="deepseek",
            risk_level=risk,
            reason=reason,
            request_id=request_id,
            raw_result={"deepseek": result, "parsed": parsed},
            generated=_normalized_generated(parsed),
        )
    except (RuntimeError, urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError) as exc:
        _mark_failure()
        fallback = rule_audit(text, rule)
        fallback.raw_result["ai_error"] = str(exc)
        fallback.raw_result["fallback_provider"] = fallback.provider
        fallback.provider = "deepseek_fallback_rule"
        return fallback


def generate_listing_metadata(text: str) -> dict:
    cfg = config()
    if not cfg.ai_enabled or not cfg.deepseek_api_key or circuit_state() == "open":
        return {"provider": "rule", "title": "", "description": text[:180], "tags": []}
    try:
        result = _deepseek_chat(
            [
                {
                    "role": "system",
                    "content": "Return strict JSON with title, description, and tags for a campus marketplace listing.",
                },
                {"role": "user", "content": text[:4000]},
            ],
            response_format={"type": "json_object"},
        )
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "{}")
        parsed = json.loads(content)
        _mark_success()
        generated = _normalized_generated(parsed)
        return {
            "provider": "deepseek",
            "title": generated["title"],
            "description": generated["description"],
            "tags": generated["tags"],
        }
    except Exception as exc:
        _mark_failure()
        return {"provider": "rule", "title": "", "description": text[:180], "tags": [], "error": str(exc)}
