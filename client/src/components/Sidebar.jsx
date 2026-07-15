import { useState } from "react";
import {
  Building2,
  ExternalLink,
  LocateFixed,
  MapPin,
  MessageSquare,
  Pill,
  Plus,
  Trash2
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
  onNewChat,
  onSelectConversation,
  onDeleteConversation
}) {
  const [coordinates, setCoordinates] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");

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

  return (
    <aside className="sidebar right-sidebar" aria-label="Thanh bên phải">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          MQ
        </div>
        <div>
          <p className="eyebrow">Nhóm 12</p>
          <h1>MedQA</h1>
        </div>
      </div>

      <button className="new-chat-button" type="button" onClick={onNewChat}>
        <Plus size={18} />
        <span>Cuộc trò chuyện mới</span>
      </button>

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
      </div>
      <div className="conversation-list">
        {conversations.length === 0 ? (
          <p className="empty-note">Chưa có hội thoại.</p>
        ) : (
          conversations.map((conversation) => (
            <div
              className={
                conversation.id === activeConversationId
                  ? "conversation-item conversation-item--active"
                  : "conversation-item"
              }
              key={conversation.id}
            >
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
                className="icon-button conversation-delete"
                type="button"
                aria-label="Xóa hội thoại"
                title="Xóa hội thoại"
                onClick={() => onDeleteConversation(conversation.id)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
