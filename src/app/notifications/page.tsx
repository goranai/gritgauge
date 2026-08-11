"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Bell, Check, Trash2, ExternalLink, Filter, Clock, AlertTriangle, Sparkles, Shield, Activity } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";

interface Notification {
  id: string;
  type: "triage_complete" | "review_ready" | "health_alert" | "security_alert";
  title: string;
  body: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

type FilterType = "all" | "unread" | "triage_complete" | "review_ready" | "health_alert" | "security_alert";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.meta?.unreadCount || data.data.filter((n: Notification) => !n.read).length);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAsRead = async (ids: string[]) => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - ids.length));
    } catch {
      // silent
    }
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await markAsRead(unreadIds);
  };

  const filteredNotifications = notifications.filter((n) => {
    switch (filter) {
      case "all": return true;
      case "unread": return !n.read;
      default: return n.type === filter;
    }
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "triage_complete": return <Sparkles className="w-5 h-5 text-purple-400" />;
      case "review_ready": return <Activity className="w-5 h-5 text-blue-400" />;
      case "health_alert": return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case "security_alert": return <Shield className="w-5 h-5 text-red-400" />;
      default: return <Bell className="w-5 h-5 text-surface-400" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "triage_complete": return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "review_ready": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "health_alert": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      case "security_alert": return "bg-red-500/10 text-red-400 border-red-500/30";
      default: return "bg-surface-800 text-surface-400";
    }
  };

  const filters: { value: FilterType; label: string; count?: number }[] = [
    { value: "all", label: "All", count: notifications.length },
    { value: "unread", label: "Unread", count: unreadCount },
    { value: "triage_complete", label: "Triage" },
    { value: "review_ready", label: "Reviews" },
    { value: "health_alert", label: "Health" },
    { value: "security_alert", label: "Security" },
  ];

  return (
    <>
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Bell className="w-8 h-8 text-brand-400" />
              Notifications
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-sm px-2.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </h1>
            <p className="text-surface-400 mt-1">Stay on top of your project health and AI insights</p>
          </div>
          <div className="flex gap-2">
            {selected.size > 0 && (
              <button
                onClick={() => markAsRead(Array.from(selected))}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Mark Selected Read
              </button>
            )}
            <button
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> Mark All Read
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border",
                filter === f.value
                  ? "bg-brand-500/10 border-brand-500/30 text-brand-400"
                  : "bg-surface-800 border-surface-700 text-surface-400 hover:border-surface-600"
              )}
            >
              {f.label}
              {f.count !== undefined && (
                <span className="ml-1.5 text-xs opacity-70">({f.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card !p-4 animate-pulse">
                <div className="skeleton h-4 w-3/4 mb-2" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            ))
          ) : filteredNotifications.length === 0 ? (
            <div className="card text-center py-16">
              <Bell className="w-12 h-12 text-surface-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-surface-300 mb-1">No notifications</h3>
              <p className="text-surface-500 text-sm">
                {filter === "all"
                  ? "You're all caught up! 🎉"
                  : "No notifications match this filter."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "card !p-4 transition-all cursor-pointer group",
                  !notification.read && "border-l-4 border-l-brand-500 bg-brand-500/5",
                  selected.has(notification.id) && "ring-2 ring-brand-500/50"
                )}
                onClick={() => {
                  if (!notification.read) markAsRead([notification.id]);
                  if (notification.actionUrl) window.open(notification.actionUrl, "_blank");
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selected.has(notification.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelect(notification.id);
                    }}
                    className="mt-1 rounded accent-brand-500"
                    onClick={(e) => e.stopPropagation()}
                  />

                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getTypeIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          "badge text-xs",
                          getTypeBadgeColor(notification.type)
                        )}
                      >
                        {notification.type.replace("_", " ")}
                      </span>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-brand-500 rounded-full" />
                      )}
                    </div>
                    <h3
                      className={cn(
                        "font-medium mb-1",
                        notification.read ? "text-surface-300" : "text-white"
                      )}
                    >
                      {notification.title}
                    </h3>
                    <p className="text-sm text-surface-400 line-clamp-2">
                      {notification.body}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-surface-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                      {notification.actionUrl && (
                        <a
                          href={notification.actionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-brand-400 hover:text-brand-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Details
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead([notification.id]);
                        }}
                        className="p-1.5 rounded hover:bg-surface-800 text-surface-400 hover:text-white"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
