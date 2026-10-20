import React from 'react';
import officialLogoUrl from '../assets/logo.png';

export { officialLogoUrl };

export interface BrandLogoProps {
  /** Size preset tailored to each placement across mobile (320px-430px), tablet, and desktop */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  /** Whether to show the platform title next to the logo */
  showText?: boolean;
  /** Optional subtitle below the platform title */
  subtitle?: string;
  /** Text theme: 'dark' (white text on dark bg) or 'light' (slate-900 text on light bg) */
  theme?: 'dark' | 'light';
  /** Hide text on extra-small mobile screens if space is tight */
  hideTextOnMobile?: boolean;
  /** Additional wrapper classes */
  className?: string;
  /** Additional image classes */
  imgClassName?: string;
  /** Click handler if interactive */
  onClick?: () => void;
}

const SIZE_CLASSES: Record<NonNullable<BrandLogoProps['size']>, string> = {
  xs: 'w-7 h-7 sm:w-8 sm:h-8',
  sm: 'w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10',
  md: 'w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12',
  lg: 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16',
  xl: 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24',
  hero: 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28',
};

const TITLE_SIZE_CLASSES: Record<NonNullable<BrandLogoProps['size']>, string> = {
  xs: 'text-xs sm:text-sm',
  sm: 'text-xs sm:text-sm md:text-base',
  md: 'text-sm sm:text-base md:text-lg',
  lg: 'text-base sm:text-lg md:text-xl',
  xl: 'text-lg sm:text-xl md:text-2xl',
  hero: 'text-xl sm:text-2xl md:text-3xl',
};

/**
 * المكون الموحد للشعار الرسمي لمنصة "الدفتر اليومي الذكي للأستاذ"
 * يحافظ على أبعاد وشفافية الشعار الأصلي دون قص أو تشويه (object-contain, height: auto)
 * ويتجاوب تلقائياً مع كافة الشاشات (من الهواتف 320px إلى الشاشات الكبيرة).
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = false,
  subtitle,
  theme = 'dark',
  hideTextOnMobile = false,
  className = '',
  imgClassName = '',
  onClick,
}) => {
  const titleColor = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const subtitleColor = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2 sm:gap-3 min-w-0 max-w-full select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div
        className={`relative shrink-0 flex items-center justify-center ${SIZE_CLASSES[size]}`}
      >
        <img
          src={officialLogoUrl}
          alt="شعار الدفتر اليومي الذكي للأستاذ"
          loading="eager"
          decoding="async"
          className={`w-full h-auto max-h-full object-contain drop-shadow-sm transition-transform duration-300 ${imgClassName}`}
        />
      </div>

      {showText && (
        <div
          className={`min-w-0 text-right leading-tight ${
            hideTextOnMobile ? 'hidden sm:block' : 'block'
          }`}
        >
          <span
            className={`font-black tracking-tight block truncate ${TITLE_SIZE_CLASSES[size]} ${titleColor}`}
          >
            الدفتر اليومي الذكي للأستاذ
          </span>
          {subtitle && (
            <span
              className={`text-[10px] sm:text-xs font-medium block truncate mt-0.5 ${subtitleColor}`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
