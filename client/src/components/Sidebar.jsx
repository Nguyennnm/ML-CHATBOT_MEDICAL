import { useState } from "react";
import {
  Building2,
  Check,
  Edit3,
  ExternalLink,
  LocateFixed,
  LogOut,
  MapPin,
  MessageSquare,
  MoreVertical,
  Pill,
  Plus,
  Trash2,
  X
} from "lucide-react";

function getMapUrl(query, coordinates) {
  if (!coordinates) {
    return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  }

  return `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${coordinates.latitude},${coordinates.longitude},14z`;
}

export function Sidebar({
  conversations,
  activeConversationId,
  currentUser,
  onNewChat,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onLogout
}) {
  const [coordinates, setCoordinates] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  function requestCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLocationStatus("ready");
      },
      () => {
        setLocationStatus("denied");
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 120000
      }
    );
  }

  const mapActions = [
    {
      icon: Building2,
      label: "Bệnh viện gần đây",
      query: "bệnh viện gần đây"
    },
    {
      icon: MapPin,
      label: "Phòng khám gần đây",
      query: "phòng khám gần đây"
    },
    {
      icon: Pill,
      label: "Nhà thuốc gần đây",
      query: "nhà thuốc gần đây"
    }
  ];

  function startRename(conversation) {
    setEditingId(conversation.id);
    setDraftTitle(conversation.title);
    setOpenMenuId(null);
  }

  function cancelRename() {
    setEditingId(null);
    setDraftTitle("");
    setIsRenaming(false);
  }

  async function submitRename(event, conversationId) {
    event.preventDefault();
    const nextTitle = draftTitle.trim();

    if (!nextTitle || isRenaming) {
      return;
    }

    setIsRenaming(true);
    try {
      await onRenameConversation(conversationId, nextTitle);
      cancelRename();
    } catch {
      // App owns the visible error banner; keep the edit form open for correction.
    } finally {
      setIsRenaming(false);
    }
  }

  function deleteConversation(conversationId) {
    setOpenMenuId(null);
    onDeleteConversation(conversationId);
  }

  return (
    <aside className="sidebar" aria-label="Thanh bên trái">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          MQ
        </div>
        <div>
          <p className="eyebrow">Nhóm 12</p>
          <h1>MedQA</h1>
        </div>
      </div>

      <div className="account-card">
        <div className="account-avatar" aria-hidden="true">
          {currentUser?.name?.slice(0, 1).toUpperCase() || "U"}
        </div>
        <div>
          <strong>{currentUser?.name || "Người dùng"}</strong>
          <span>{currentUser?.email}</span>
        </div>
        <button
          className="icon-button account-logout"
          type="button"
          aria-label="Đăng xuất"
          title="Đăng xuất"
          onClick={onLogout}
        >
          <LogOut size={16} />
        </button>
      </div>

      <button className="new-chat-button" type="button" onClick={onNewChat}>
        <Plus size={18} />
        <span>Cuộc trò chuyện mới</span>
      </button>

      <div className="sidebar-scroll-area">
        <section className="map-shortcut" aria-label="Mở bản đồ thật">
          <div>
            <p className="eyebrow">Bản đồ thật</p>
            <h2>Gợi ý nơi khám gần bạn</h2>
            <p>Mở Google Maps để xem bệnh viện, phòng khám và nhà thuốc gần vị trí hiện tại.</p>
          </div>

          <button className="location-button" type="button" onClick={requestCurrentLocation}>
            <LocateFixed size={18} />
            <span>{locationStatus === "ready" ? "Đã lấy vị trí" : "Dùng vị trí hiện tại"}</span>
          </button>

          {locationStatus === "denied" ? (
            <p className="location-note">Không lấy được vị trí. Bạn vẫn có thể mở bản đồ và cho phép Google Maps dùng vị trí.</p>
          ) : null}

          <div className="map-action-list">
            {mapActions.map((action) => {
              const Icon = action.icon;
              return (
                <a
                  className="map-action"
                  href={getMapUrl(action.query, coordinates)}
                  key={action.label}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon size={18} />
                  <span>{action.label}</span>
                  <ExternalLink size={16} />
                </a>
              );
            })}
          </div>
        </section>

        <div className="conversation-heading">
          <MessageSquare size={17} />
          <span>Lịch sử hội thoại</span>
          <small>{conversations.length}</small>
        </div>
        <div className="conversation-list">
          {conversations.length === 0 ? (
            <p className="empty-note">Chưa có hội thoại.</p>
          ) : (
            conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              const isMenuOpen = openMenuId === conversation.id;
              const isEditing = editingId === conversation.id;

              return (
                <div
                  className={
                    isActive
                      ? "conversation-item conversation-item--active"
                      : "conversation-item"
                  }
                  key={conversation.id}
                >
                  {isEditing ? (
                    <form
                      className="conversation-rename"
                      onSubmit={(event) => submitRename(event, conversation.id)}
                    >
                      <input
                        aria-label="Tên hội thoại"
                        autoFocus
                        maxLength={80}
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            cancelRename();
                          }
                        }}
                      />
                      <button
                        className="icon-button"
                        type="submit"
                        aria-label="Lưu tên hội thoại"
                        title="Lưu"
                        disabled={isRenaming || !draftTitle.trim()}
                      >
                        <Check size={15} />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label="Hủy đổi tên"
                        title="Hủy"
                        onClick={cancelRename}
                      >
                        <X size={15} />
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="conversation-main">
                        <button
                          className="conversation-select"
                          type="button"
                          onClick={() => onSelectConversation(conversation)}
                        >
                          <MessageSquare size={17} />
                          <span>{conversation.title}</span>
                          <small>{conversation.messageCount}</small>
                        </button>
                        <button
                          className="icon-button conversation-menu-button"
                          type="button"
                          aria-label="Tùy chọn hội thoại"
                          aria-expanded={isMenuOpen}
                          title="Tùy chọn"
                          onClick={() => setOpenMenuId(isMenuOpen ? null : conversation.id)}
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>

                      {isMenuOpen ? (
                        <div className="conversation-menu" role="menu">
                          <button type="button" role="menuitem" onClick={() => startRename(conversation)}>
                            <Edit3 size={15} />
                            <span>Đổi tên</span>
                          </button>
                          <button
                            className="conversation-menu-danger"
                            type="button"
                            role="menuitem"
                            onClick={() => deleteConversation(conversation.id)}
                          >
                            <Trash2 size={15} />
                            <span>Xóa</span>
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
