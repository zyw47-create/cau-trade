from __future__ import annotations

import hmac
import os
import re
import uuid

from flask import Blueprint, Response, request

from ..responses import api_error, api_ok
from ..runtime import (
    app_config,
    make_placeholder_png,
    path_inside,
    safe_upload_scene,
    to_int,
    upload_root,
    upload_url_for,
)
from ..security import PrincipalError, jwt_verify, verify_live_token_principal


bp = Blueprint("assets", __name__)


@bp.route("/uploads/<path:filename>")
def uploaded_asset(filename: str):
    try:
        root = upload_root()
        safe_path = os.path.abspath(os.path.join(root, filename))
        if path_inside(safe_path, root) and os.path.isfile(safe_path):
            with open(safe_path, "rb") as file:
                data = file.read()
            ext = os.path.splitext(safe_path)[1].lower()
            mimetype = "image/png" if ext == ".png" else "image/webp" if ext == ".webp" else "image/jpeg"
            return Response(data, mimetype=mimetype, headers={"Cache-Control": "public, max-age=86400"})
        data = make_placeholder_png(filename)
    except Exception:
        data = make_placeholder_png("fallback")
    return Response(data, mimetype="image/png", headers={"Cache-Control": "public, max-age=86400"})


@bp.route("/api/files/upload", methods=["POST"])
@bp.route("/v1/api/files/upload", methods=["POST"])
def api_files_upload():
    config = app_config()
    if request.content_length and request.content_length > config.max_upload_bytes:
        return api_error("upload file is too large", 413, 413)
    token = request.form.get("uploadToken") or request.headers.get("X-Upload-Token", "")
    payload = jwt_verify(token) if token else None
    if not payload or payload.get("purpose") != "upload":
        return api_error("missing or invalid upload token", 401, 401)
    try:
        principal = verify_live_token_principal(payload)
    except PrincipalError as exc:
        return api_error(str(exc), 401, 401)
    token_user_id = to_int(payload.get("sub"))
    form_user_id = to_int(request.form.get("userId"), token_user_id)
    if token_user_id <= 0 or form_user_id != token_user_id or int(principal["id"]) != token_user_id:
        return api_error("upload token subject mismatch", 401, 401)
    scene = safe_upload_scene(request.form.get("scene") or payload.get("scene") or "goods")
    if not hmac.compare_digest(scene, safe_upload_scene(str(payload.get("scene") or ""))):
        return api_error("upload token scene mismatch", 403, 403)
    file = request.files.get("file")
    if not file:
        return api_error("missing upload file")
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        ext = ".jpg"
    requested_name = re.sub(r"[^a-zA-Z0-9_.-]", "", request.form.get("objectKey") or "")
    requested_stem = os.path.splitext(requested_name)[0][:48] or "upload"
    filename = f"{token_user_id}-{uuid.uuid4().hex}-{requested_stem}{ext}"
    root = upload_root()
    scene_dir = os.path.abspath(os.path.join(root, scene))
    if not path_inside(scene_dir, root):
        return api_error("invalid upload scene")
    os.makedirs(scene_dir, exist_ok=True)
    target = os.path.abspath(os.path.join(scene_dir, filename))
    if not path_inside(target, scene_dir):
        return api_error("invalid upload filename")
    file.save(target)
    return api_ok({"url": upload_url_for(scene, filename), "scene": scene})
