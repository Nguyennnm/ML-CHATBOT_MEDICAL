from pathlib import Path
import shutil
import zipfile

from huggingface_hub import snapshot_download


REPO_ID = (
    "cross-encoder/"
    "mmarco-mMiniLMv2-L12-H384-v1"
)

BASE_DIR = Path(__file__).resolve().parent

MODEL_DIR = (
    BASE_DIR
    / "mmarco-reranker"
)

ZIP_BASE = (
    BASE_DIR
    / "mmarco-reranker"
)

ZIP_PATH = (
    BASE_DIR
    / "mmarco-reranker.zip"
)


print("[INFO] Đang tải reranker...")

snapshot_download(
    repo_id=REPO_ID,
    local_dir=str(MODEL_DIR),
    max_workers=1,
)

print(
    "[OK] Đã tải model về:",
    MODEL_DIR,
)


required_files = [
    MODEL_DIR / "config.json",
    MODEL_DIR / "model.safetensors",
]

for path in required_files:
    if not path.exists():
        raise FileNotFoundError(
            f"Thiếu file: {path}"
        )

print(
    "[INFO] model.safetensors:",
    f"{(MODEL_DIR / 'model.safetensors').stat().st_size / 1024**2:.2f} MB",
)


if ZIP_PATH.exists():
    ZIP_PATH.unlink()

created_zip = Path(
    shutil.make_archive(
        base_name=str(ZIP_BASE),
        format="zip",
        root_dir=str(MODEL_DIR),
    )
)

if not zipfile.is_zipfile(created_zip):
    raise RuntimeError(
        "File vừa tạo không phải ZIP hợp lệ."
    )

with zipfile.ZipFile(created_zip, "r") as zip_file:
    bad_file = zip_file.testzip()

    if bad_file is not None:
        raise RuntimeError(
            f"ZIP bị lỗi tại: {bad_file}"
        )

print(
    "[OK] Đã tạo:",
    created_zip,
)

print(
    "[INFO] Dung lượng ZIP:",
    f"{created_zip.stat().st_size / 1024**2:.2f} MB",
)