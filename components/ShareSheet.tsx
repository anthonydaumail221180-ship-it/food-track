import React, { useState } from 'react';
import { X, Link as LinkIcon, Check, Share2, MessageCircle, Mail, Instagram, Facebook, Twitter } from 'lucide-react';
import { ShareableContent, ShareTargetId, openShareTarget, copyLink, nativeShare, isNativeShareSupported } from '../services/shareSocial';

interface ShareSheetProps {
  content: ShareableContent | null;
  onClose: () => void;
}

interface TargetDef { id: ShareTargetId; label: string; icon: React.ReactNode; color: string; }

const TARGETS: TargetDef[] = [
  { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={22} />, color: 'bg-green-500' },
  { id: 'instagram', label: 'Instagram', icon: <Instagram size={22} />, color: 'bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500' },
  { id: 'tiktok', label: 'TikTok', icon: <TikTokIcon />, color: 'bg-black' },
  { id: 'facebook', label: 'Facebook', icon: <Facebook size={22} />, color: 'bg-blue-600' },
  { id: 'twitter', label: 'X / Twitter', icon: <Twitter size={22} />, color: 'bg-black' },
  { id: 'telegram', label: 'Telegram', icon: <MessageCircle size={22} />, color: 'bg-sky-500' },
  { id: 'sms', label: 'SMS', icon: <MessageCircle size={22} />, color: 'bg-brand-blue' },
  { id: 'email', label: 'Email', icon: <Mail size={22} />, color: 'bg-brand-text' },
];

function TikTokIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05 6.33 6.33 0 1 0 6.33 6.33V8.87a8.16 8.16 0 0 0 4.77 1.52V7a4.83 4.83 0 0 1-.87-.31z"/>
    </svg>
  );
}

export const ShareSheet: React.FC<ShareSheetProps> = ({ content, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (!content) return null;

  const onNative = async () => {
    const ok = await nativeShare(content);
    if (ok) onClose();
    else setToast('Partage natif indisponible, choisis une app ci-dessous.');
  };

  const onPickTarget = async (id: ShareTargetId) => {
    if (id === 'instagram' || id === 'tiktok') {
      setToast(id === 'instagram' ? 'Texte copie — colle-le dans ta story Insta' : 'Texte copie — colle-le dans ta description TikTok');
    }
    await openShareTarget(id, content);
    setTimeout(() => { onClose(); setToast(null); }, 800);
  };

  const onCopy = async () => {
    const ok = await copyLink(content);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
  };

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-slide-up" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-brand-gradient flex items-center justify-center text-white flex-shrink-0 shadow-glow">
            <Share2 size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold">Partager</p>
            <h3 className="font-display text-xl text-brand-text leading-tight truncate">{content.title}</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center flex-shrink-0 text-brand-muted"><X size={20} /></button>
        </div>

        {isNativeShareSupported() && (
          <button
            onClick={onNative}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand-gradient text-white font-bold text-sm shadow-glow active:scale-[0.98] transition mb-4"
          >
            <Share2 size={16} /> Partager via mon téléphone
          </button>
        )}

        <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold mb-2 px-1">Partager sur</p>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {TARGETS.map(t => (
            <button
              key={t.id}
              onClick={() => onPickTarget(t.id)}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition group"
            >
              <div className={`w-12 h-12 rounded-2xl ${t.color} flex items-center justify-center text-white shadow-md group-hover:brightness-110`}>
                {t.icon}
              </div>
              <span className="text-[10px] text-brand-text font-medium leading-tight text-center">{t.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onCopy}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand-bg border border-brand-border text-brand-text font-bold text-sm hover:border-brand-orange transition"
        >
          {copied ? <><Check size={16} className="text-green-600" /> Lien copié !</> : <><LinkIcon size={16} /> Copier le lien</>}
        </button>

        {toast && <p className="mt-3 text-[11px] text-brand-text text-center bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">{toast}</p>}
      </div>
    </div>
  );
};
