import React, { useState, useEffect } from 'react';
import { Users, Plus, Hash, Play, RefreshCw, X, Copy, Check } from 'lucide-react';

interface PublicRoom {
  id: string;
  status: string;
  playerCount: number;
  spectatorCount: number;
  players: { name: string; side: string }[];
}

interface OnlineLobbyModalProps {
  isOpen: boolean;
  playerName: string;
  onClose: () => void;
  onJoinRoom: (roomId: string, isPrivate: boolean) => void;
  onUpdateName: (name: string) => void;
}

export const OnlineLobbyModal: React.FC<OnlineLobbyModalProps> = ({
  isOpen,
  playerName,
  onClose,
  onJoinRoom,
  onUpdateName,
}) => {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setPublicRooms(data.rooms || []);
      }
    } catch {
      // offline or server not ready
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRooms();
      const interval = setInterval(fetchRooms, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuickMatch = async () => {
    try {
      const res = await fetch('/api/quick-match');
      if (res.ok) {
        const data = await res.json();
        onJoinRoom(data.roomId, false);
      } else {
        const fallbackRoom = `천하-${Math.floor(1000 + Math.random() * 9000)}`;
        onJoinRoom(fallbackRoom, false);
      }
    } catch {
      const fallbackRoom = `천하-${Math.floor(1000 + Math.random() * 9000)}`;
      onJoinRoom(fallbackRoom, false);
    }
  };

  const handleCreatePrivate = () => {
    const privateCode = `비밀-${Math.floor(1000 + Math.random() * 9000)}`;
    onJoinRoom(privateCode, true);
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCodeInput.trim()) {
      onJoinRoom(roomCodeInput.trim(), false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-stone-100">실시간 온라인 대국실</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* User Nickname Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-300">내 대국명 (닉네임)</label>
            <input
              type="text"
              value={playerName}
              maxLength={12}
              onChange={(e) => onUpdateName(e.target.value)}
              placeholder="대국자명을 입력하세요"
              className="w-full px-3 py-2 text-sm bg-stone-800/80 border border-stone-700 rounded-xl text-stone-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleQuickMatch}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg transition-transform active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" /> 빠른 대국 참가
            </button>
            <button
              type="button"
              onClick={handleCreatePrivate}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-bold text-xs sm:text-sm transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" /> 친구 초대 비밀방
            </button>
          </div>

          {/* Enter Room Code */}
          <form onSubmit={handleJoinByCode} className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-stone-300">방 코드로 바로 입장</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                placeholder="방 코드 (예: 천하-1234)"
                className="flex-1 px-3 py-2 text-sm bg-stone-800/80 border border-stone-700 rounded-xl text-stone-100 focus:outline-none focus:border-emerald-500 uppercase"
              />
              <button
                type="submit"
                disabled={!roomCodeInput.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-colors"
              >
                입장
              </button>
            </div>
          </form>

          {/* Public Rooms List */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span className="font-semibold text-stone-300">개설된 대국방 목록</span>
              <button
                type="button"
                onClick={fetchRooms}
                className="flex items-center gap-1 hover:text-stone-200 text-[11px]"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingRooms ? 'animate-spin' : ''}`} /> 새로고침
              </button>
            </div>

            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
              {publicRooms.length === 0 ? (
                <div className="text-center py-6 text-xs text-stone-500 bg-stone-800/30 rounded-xl border border-stone-800/60">
                  현재 대기 중인 공개 대국방이 없습니다.<br />
                  직접 빠른 대국 또는 비밀방을 생성해보세요!
                </div>
              ) : (
                publicRooms.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2.5 bg-stone-800/50 border border-stone-800 rounded-xl hover:border-stone-700 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-stone-200 truncate">{r.id}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            r.status === 'playing'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {r.status === 'playing' ? '대국 중' : '대기 중'}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-400 mt-0.5">
                        대국자: {r.players.map((p) => p.name).join(' vs ') || '대기 중'} (인원 {r.playerCount}/2)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onJoinRoom(r.id, false)}
                      className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-stone-100 text-xs font-semibold rounded-lg shrink-0"
                    >
                      {r.playerCount >= 2 ? '관전' : '입장'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
