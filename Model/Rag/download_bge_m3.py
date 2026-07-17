from __future__ import annotations

import shutil
import time
from pathlib import Path
from typing import Final

import requests
from tqdm import tqdm


REPO_ID: Final[str] = "BAAI/bge-m3"

BASE_URL: Final[str] = (
    f"https://huggingface.co/{REPO_ID}/resolve/main"
)

# Thư mục model được tạo bên cạnh file Python này.
SCRIPT_DIR = Path(__file__).resolve().parent
MODEL_DIR = SCRIPT_DIR / "bge-m3"

# Danh sách chính xác các file cần cho SentenceTransformer + PyTorch.
REQUIRED_FILES: Final[list[str]] = [
    "1_Pooling/config.json",
    "config.json",
    "config_sentence_transformers.json",
    "modules.json",
    "sentence_bert_config.json",
    "sentencepiece.bpe.model",
    "special_tokens_map.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "pytorch_model.bin",
]

# File pytorch_model.bin phải lớn hơn khoảng 2 GB.
MIN_WEIGHT_SIZE_BYTES: Final[int] = 2_000_000_000

CHUNK_SIZE: Final[int] = 1024 * 1024  # 1 MB
MAX_RETRIES: Final[int] = 20


def get_remote_size(
    session: requests.Session,
    url: str,
) -> int | None:
    """
    Thử lấy kích thước file trên server.

    Một số CDN có thể không trả Content-Length,
    khi đó hàm trả về None.
    """
    try:
        response = session.head(
            url,
            allow_redirects=True,
            timeout=(20, 60),
        )

        response.raise_for_status()

        content_length = response.headers.get(
            "Content-Length"
        )

        if content_length is None:
            return None

        return int(content_length)

    except requests.RequestException:
        return None


def download_file(
    session: requests.Session,
    relative_path: str,
) -> None:
    """
    Tải một file với khả năng resume.

    File đang tải được lưu với đuôi .part.
    Chỉ đổi sang tên chính thức sau khi tải hoàn chỉnh.
    """
    url = f"{BASE_URL}/{relative_path}?download=true"
    destination = MODEL_DIR / relative_path
    partial_path = destination.with_name(
        destination.name + ".part"
    )

    destination.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    remote_size = get_remote_size(
        session,
        url,
    )

    # File hoàn chỉnh đã tồn tại.
    if destination.exists():
        local_size = destination.stat().st_size

        if (
            remote_size is None
            or local_size == remote_size
        ):
            print(
                f"[SKIP] {relative_path} "
                f"đã tồn tại: "
                f"{local_size / 1024**2:.2f} MB"
            )
            return

        print(
            f"[WARN] {relative_path} có kích thước "
            f"không đúng; tải lại."
        )

        destination.unlink()

    for attempt in range(
        1,
        MAX_RETRIES + 1,
    ):
        downloaded_size = (
            partial_path.stat().st_size
            if partial_path.exists()
            else 0
        )

        headers = {}

        if downloaded_size > 0:
            headers["Range"] = (
                f"bytes={downloaded_size}-"
            )

        try:
            print(
                f"\n[DOWNLOAD] {relative_path}"
            )

            if downloaded_size > 0:
                print(
                    "[INFO] Tiếp tục từ:",
                    f"{downloaded_size / 1024**2:.2f} MB",
                )

            response = session.get(
                url,
                headers=headers,
                stream=True,
                allow_redirects=True,
                timeout=(30, 120),
            )

            response.raise_for_status()

            # Server không hỗ trợ Range và trả lại toàn bộ file.
            if (
                downloaded_size > 0
                and response.status_code == 200
            ):
                print(
                    "[WARN] Server không tiếp tục được "
                    "file cũ; tải lại từ đầu."
                )

                downloaded_size = 0

                if partial_path.exists():
                    partial_path.unlink()

            file_mode = (
                "ab"
                if downloaded_size > 0
                and response.status_code == 206
                else "wb"
            )

            response_length = int(
                response.headers.get(
                    "Content-Length",
                    0,
                )
            )

            total_size = (
                downloaded_size + response_length
                if response.status_code == 206
                else response_length
            )

            with (
                partial_path.open(file_mode) as output_file,
                tqdm(
                    total=total_size or None,
                    initial=downloaded_size,
                    unit="B",
                    unit_scale=True,
                    unit_divisor=1024,
                    desc=relative_path,
                ) as progress_bar,
            ):
                for chunk in response.iter_content(
                    chunk_size=CHUNK_SIZE
                ):
                    if not chunk:
                        continue

                    output_file.write(chunk)
                    output_file.flush()

                    progress_bar.update(
                        len(chunk)
                    )

            final_size = partial_path.stat().st_size

            if (
                remote_size is not None
                and final_size != remote_size
            ):
                raise IOError(
                    f"File chưa hoàn chỉnh: "
                    f"{final_size} / {remote_size} bytes"
                )

            partial_path.replace(destination)

            print(
                f"[OK] {relative_path}: "
                f"{final_size / 1024**2:.2f} MB"
            )

            return

        except (
            requests.RequestException,
            OSError,
        ) as error:
            print(
                f"[WARN] Lần {attempt}/"
                f"{MAX_RETRIES} thất bại:"
            )
            print(error)

            if attempt == MAX_RETRIES:
                raise RuntimeError(
                    f"Không thể tải: {relative_path}"
                ) from error

            wait_seconds = min(
                5 * attempt,
                60,
            )

            print(
                f"[INFO] Chờ {wait_seconds} giây "
                "rồi tiếp tục..."
            )

            time.sleep(wait_seconds)


def validate_model() -> None:
    """Kiểm tra cấu trúc model sau khi tải."""
    print("\n" + "=" * 70)
    print("KIỂM TRA MODEL")
    print("=" * 70)

    missing_files: list[Path] = []

    for relative_path in REQUIRED_FILES:
        file_path = MODEL_DIR / relative_path

        if not file_path.exists():
            print(
                f"[MISSING] {relative_path}"
            )

            missing_files.append(file_path)
            continue

        size_mb = (
            file_path.stat().st_size
            / 1024**2
        )

        print(
            f"[OK] {relative_path}: "
            f"{size_mb:.2f} MB"
        )

    if missing_files:
        raise FileNotFoundError(
            f"Còn thiếu {len(missing_files)} file."
        )

    weight_path = (
        MODEL_DIR
        / "pytorch_model.bin"
    )

    weight_size = weight_path.stat().st_size

    if weight_size < MIN_WEIGHT_SIZE_BYTES:
        raise RuntimeError(
            "pytorch_model.bin có vẻ chưa đầy đủ.\n"
            f"Kích thước hiện tại: "
            f"{weight_size / 1024**3:.2f} GiB"
        )

    print(
        "\n[READY] BGE-M3 đã đầy đủ."
    )

    print(
        "[INFO] Trọng số:",
        f"{weight_size / 1024**3:.2f} GiB",
    )


def create_zip() -> Path:
    """
    Nén model thành bge-m3-model.zip.

    Bên trong ZIP chứa trực tiếp config.json,
    modules.json, pytorch_model.bin,...
    """
    zip_base_path = (
        SCRIPT_DIR
        / "bge-m3-model"
    )

    zip_path = Path(
        shutil.make_archive(
            base_name=str(zip_base_path),
            format="zip",
            root_dir=str(MODEL_DIR),
        )
    )

    print(
        "\n[OK] Đã tạo ZIP:"
    )

    print(zip_path)

    print(
        "[INFO] Dung lượng ZIP:",
        f"{zip_path.stat().st_size / 1024**3:.2f} GiB",
    )

    return zip_path


def main() -> None:
    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    session = requests.Session()

    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 "
                "BGE-M3-Downloader/1.0"
            )
        }
    )

    print("[INFO] Model directory:")
    print(MODEL_DIR)

    for relative_path in REQUIRED_FILES:
        download_file(
            session=session,
            relative_path=relative_path,
        )

    validate_model()
    create_zip()

    print("\n" + "=" * 70)
    print("HOÀN TẤT")
    print("=" * 70)

    print(
        "Upload file bge-m3-model.zip "
        "lên Google Drive."
    )


if __name__ == "__main__":
    main()
