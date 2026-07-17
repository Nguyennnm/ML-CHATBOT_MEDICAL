import { useState } from "react";
import { Activity, LockKeyhole, Mail, Stethoscope, UserRound } from "lucide-react";

export function AuthPanel({ apiStatus, error, isSubmitting, onLogin, onRegister }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });
  const isRegister = mode === "register";

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (isRegister) {
      onRegister(form);
      return;
    }

    onLogin({
      email: form.email,
      password: form.password
    });
  }

  return (
    <main className="auth-shell">
      <section className="auth-copy" aria-labelledby="auth-title">
        <p className="eyebrow">MedQA bảo mật hội thoại</p>
        <h1 id="auth-title">Đăng nhập để lưu lịch sử tư vấn theo từng tài khoản</h1>
        <p>
          Mỗi người dùng có một không gian hội thoại riêng. Câu hỏi y tế, nguồn tham khảo
          và tiêu đề cuộc trò chuyện được tách theo tài khoản đăng nhập.
        </p>
        <div className="auth-signal-list">
          <span>
            <Stethoscope size={18} />
            Lịch sử riêng
          </span>
          <span>
            <Activity size={18} />
            Chat realtime
          </span>
        </div>
      </section>

      <section className="auth-card" aria-label={isRegister ? "Đăng ký" : "Đăng nhập"}>
        <div className="auth-card-header">
          <div className="brand-mark" aria-hidden="true">
            MQ
          </div>
          <div>
            <p className="eyebrow">{apiStatus === "online" ? "API sẵn sàng" : "Đang kiểm tra API"}</p>
            <h2>{isRegister ? "Tạo tài khoản" : "Đăng nhập"}</h2>
          </div>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Chọn chế độ xác thực">
          <button
            className={mode === "login" ? "auth-tab auth-tab--active" : "auth-tab"}
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            onClick={() => setMode("login")}
          >
            Đăng nhập
          </button>
          <button
            className={mode === "register" ? "auth-tab auth-tab--active" : "auth-tab"}
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            onClick={() => setMode("register")}
          >
            Đăng ký
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister ? (
            <label className="auth-field">
              <span>Họ tên</span>
              <span>
                <UserRound size={17} />
                <input
                  autoComplete="name"
                  maxLength={80}
                  placeholder="Ví dụ: Nguyễn An"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                />
              </span>
            </label>
          ) : null}

          <label className="auth-field">
            <span>Email</span>
            <span>
              <Mail size={17} />
              <input
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                required
              />
            </span>
          </label>

          <label className="auth-field">
            <span>Mật khẩu</span>
            <span>
              <LockKeyhole size={17} />
              <input
                autoComplete={isRegister ? "new-password" : "current-password"}
                minLength={6}
                placeholder="Ít nhất 6 ký tự"
                type="password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                required
              />
            </span>
          </label>

          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="auth-submit" type="submit" disabled={isSubmitting || apiStatus === "offline"}>
            {isSubmitting ? "Đang xử lý..." : isRegister ? "Đăng ký và vào chat" : "Đăng nhập"}
          </button>
        </form>
      </section>
    </main>
  );
}
