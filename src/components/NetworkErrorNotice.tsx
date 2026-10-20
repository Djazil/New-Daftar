import React from 'react';
import { WifiOff, RefreshCw, ShieldAlert } from 'lucide-react';
import BrandLogo from './BrandLogo';

interface NetworkErrorNoticeProps {
  onRetry: () => void;
  isRetrying?: boolean;
}

export default function NetworkErrorNotice({ onRetry, isRetrying }: NetworkErrorNoticeProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans dir-rtl flex items-center justify-center p-4 relative overflow-hidden">
      {/* خلفية زجاجية مع حزم ضوئية خفيفة */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-rose-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
        <div className="flex justify-center">
          <BrandLogo size="lg" showText={false} />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-300 text-xs font-bold border border-rose-500/20">
            <ShieldAlert className="w-3.5 h-3.5" />
            تعذر الاتصال بالسيرفر
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            تعذر التحقق من حالة الحساب
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            حدث انقطاع في الاتصال بالإنترنت أو استجابة الخادم. حرصاً على أمان بيانات الدفتر، تم حظر الوصول مؤقتاً لحين استعادة الاتصال وتأكيد حالة تفعيل الحساب.
          </p>
        </div>

        <div className="pt-2 space-y-3">
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20 active:scale-95 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'جاري إعادة محاولة الاتصال...' : 'إعادة محاولة التحقق الآن'}</span>
          </button>

          <p className="text-[11px] text-slate-500">
            تأكد من اتصالك بالشبكة ثم انقر على زر إعادة المحاولة أعلى.
          </p>
        </div>
      </div>
    </div>
  );
}
