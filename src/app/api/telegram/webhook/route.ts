import { NextRequest, NextResponse } from 'next/server';
import { addToBlacklist, removeFromBlacklist } from '@/lib/sheets';
import { sendTelegramAlert } from '@/lib/telegram';

const ALLOWED_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    from?: { first_name?: string; last_name?: string };
    text?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();
    const message = update.message;
    if (!message?.text) return NextResponse.json({ ok: true });

    const chatId = String(message.chat.id);
    const text = message.text.trim();
    const sender = [message.from?.last_name, message.from?.first_name].filter(Boolean).join('');

    // 허용된 채팅방에서만 명령어 처리
    if (chatId !== ALLOWED_CHAT_ID) {
      return NextResponse.json({ ok: true });
    }

    // /블랙 010-1234-5678 사유
    if (text.startsWith('/블랙추가') || text.startsWith('/블랙 ')) {
      const prefix = text.startsWith('/블랙추가') ? '/블랙추가' : '/블랙';
      const args = text.slice(prefix.length).trim();
      const parts = args.split(/\s+/);
      const phone = parts[0];
      const reason = parts.slice(1).join(' ');

      if (!phone || !/^01[016789]-?\d{3,4}-?\d{4}$/.test(phone.replace(/-/g, ''))) {
        await sendTelegramAlert('사용법: /블랙 010-1234-5678 사유\n예: /블랙 010-1234-5678 대리투표 시도');
        return NextResponse.json({ ok: true });
      }

      const result = await addToBlacklist(phone, reason || `${sender} 등록`);
      await sendTelegramAlert(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
      return NextResponse.json({ ok: true });
    }

    // /블랙해제 010-1234-5678
    if (text.startsWith('/블랙해제')) {
      const phone = text.slice('/블랙해제'.length).trim();

      if (!phone || !/^01[016789]-?\d{3,4}-?\d{4}$/.test(phone.replace(/-/g, ''))) {
        await sendTelegramAlert('사용법: /블랙해제 010-1234-5678');
        return NextResponse.json({ ok: true });
      }

      const result = await removeFromBlacklist(phone);
      await sendTelegramAlert(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
      return NextResponse.json({ ok: true });
    }

    // /도움
    if (text.startsWith('/도움') || text.startsWith('/help')) {
      await sendTelegramAlert(
        '<b>📋 봇 명령어</b>\n\n' +
        '/블랙 010-1234-5678 사유 — 블랙리스트 추가\n' +
        '/블랙해제 010-1234-5678 — 블랙리스트 제거\n' +
        '/도움 — 명령어 안내'
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}
