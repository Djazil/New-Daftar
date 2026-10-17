import React from 'react';

/**
 * تطبيع حرف عربي واحد مع معالجة كافة الفروق الصوتية والإملائية:
 * - إزالة التشكيل (الفتحة، الضمة، الكسرة، الشدة، التنوين...) والتطويل
 * - توحيد أشكال الألف: (أ، إ، آ، ٱ -> ا)
 * - توحيد التاء المربوطة والهاء: (ة -> ه)
 * - توحيد الياء والألف المقصورة والهمزة على النبرة: (ى، ي، ئ -> ي)
 * - توحيد الواو والهمزة على الواو: (ؤ، و -> و)
 * - الهمزة المنفردة: (ء -> ء)
 * - الأرقام المشرقية والمغربية
 */
export function normalizeArabicChar(ch: string): string {
  if (!ch) return '';
  const c = ch.toLowerCase();
  // إزالة التشكيل والتطويل
  if (/[\u064B-\u065F\u0670\u0617-\u061A\u0640]/.test(c)) return '';
  // توحيد الألف بكافة أشكالها
  if (/[أإآٱ]/.test(c)) return 'ا';
  // توحيد التاء المربوطة والهاء في أواخر الكلمات
  if (c === 'ة') return 'ه';
  // توحيد الياء والألف المقصورة والهمزة على النبرة
  if (/[ىيئ]/.test(c)) return 'ي';
  // توحيد الواو والهمزة على الواو
  if (/[ؤو]/.test(c)) return 'و';
  // الكاف الفارسية
  if (c === 'ک') return 'ك';
  // الأرقام
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  const digitIdx = arabicDigits.indexOf(c);
  if (digitIdx !== -1) return String(digitIdx);
  return c;
}

/**
 * تطبيع النصوص والأسماء العربية للمقارنة الذكية الفورية
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  let res = '';
  for (const ch of text) {
    const norm = normalizeArabicChar(ch);
    if (norm) {
      res += norm;
    }
  }
  return res.replace(/\s+/g, ' ').trim();
}

/**
 * فحص فوري وذكي ما إذا كان التلميذ يطابق حرف أو كلمة البحث:
 * - بمجرد كتابة حرف واحد يظهر كل تلميذ يتضمن اسمه الأول أو لقبه أو كوده ذلك الحرف
 * - دعم الألف والهمزات والتاء المربوطة بدون حساسية للإملاء
 * - دعم البحث باللقب أولاً أو الاسم أولاً
 */
export function matchesStudentQuery(
  student: {
    firstName?: string;
    lastName?: string;
    parentCode?: string;
    parentName?: string;
    className?: string;
  },
  query: string
): boolean {
  if (!query || !query.trim()) return true;
  const qTrim = query.trim();
  const qClean = normalizeArabic(qTrim);
  if (!qClean) return true;

  const first = student.firstName || '';
  const last = student.lastName || '';
  const code = (student.parentCode || '').toLowerCase();
  const parentName = student.parentName || '';
  const clsName = student.className || '';

  const normFirst = normalizeArabic(first);
  const normLast = normalizeArabic(last);
  const normParent = normalizeArabic(parentName);
  const normCls = normalizeArabic(clsName);
  const normFull1 = `${normLast} ${normFirst}`;
  const normFull2 = `${normFirst} ${normLast}`;

  // فحص مباشر للحرف الواحد (single character)
  if (qClean.length === 1) {
    return (
      normFirst.includes(qClean) ||
      normLast.includes(qClean) ||
      normFull1.includes(qClean) ||
      normFull2.includes(qClean) ||
      code.includes(qTrim.toLowerCase()) ||
      normParent.includes(qClean) ||
      normCls.includes(qClean) ||
      first.toLowerCase().includes(qTrim.toLowerCase()) ||
      last.toLowerCase().includes(qTrim.toLowerCase())
    );
  }

  // فحص بالكلمات المتعددة
  const qWords = qClean.split(' ').filter(Boolean);
  const fullHaystack = `${normLast} ${normFirst} ${normParent} ${code} ${normCls} ${first.toLowerCase()} ${last.toLowerCase()}`;

  return qWords.every(w => fullHaystack.includes(w));
}

/**
 * مكون تظليل الحرف أو الكلمة المطابقة في اسم التلميذ:
 * يقوم بتحديد وتمييز كل حرف يطابق الحرف المدخل بلون ذهبي واضح ومميز
 */
export function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim() || !text) return <>{text}</>;

  const qTrim = query.trim();
  const qClean = normalizeArabic(qTrim);
  if (!qClean) return <>{text}</>;

  // في حالة الحرف الواحد: تظليل كل ظهور للحرف في الاسم بدقة متناهية
  if (qClean.length === 1) {
    const targetNormChar = qClean;
    const targetDirectChar = qTrim.toLowerCase();

    const parts: Array<{ text: string; isMatch: boolean }> = [];
    let currentPart = '';
    let currentIsMatch = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const normCh = normalizeArabicChar(ch);
      const isMatch = normCh === targetNormChar || ch.toLowerCase() === targetDirectChar;

      if (i === 0) {
        currentPart = ch;
        currentIsMatch = isMatch;
      } else if (isMatch === currentIsMatch) {
        currentPart += ch;
      } else {
        parts.push({ text: currentPart, isMatch: currentIsMatch });
        currentPart = ch;
        currentIsMatch = isMatch;
      }
    }
    if (currentPart) {
      parts.push({ text: currentPart, isMatch: currentIsMatch });
    }

    return (
      <>
        {parts.map((p, idx) =>
          p.isMatch ? (
            <mark
              key={idx}
              className="bg-amber-300 text-amber-950 font-black px-1 py-0.5 rounded ring-1 ring-amber-400 mx-0.5 inline-block shadow-xs"
            >
              {p.text}
            </mark>
          ) : (
            <React.Fragment key={idx}>{p.text}</React.Fragment>
          )
        )}
      </>
    );
  }

  // في حالة كلمة أو عدة حروف متتابعة:
  const directIdx = text.toLowerCase().indexOf(qTrim.toLowerCase());
  if (directIdx !== -1) {
    const before = text.slice(0, directIdx);
    const match = text.slice(directIdx, directIdx + qTrim.length);
    const after = text.slice(directIdx + qTrim.length);
    return (
      <>
        {before}
        <mark className="bg-amber-300 text-amber-950 font-black px-1 py-0.5 rounded ring-1 ring-amber-400 mx-0.5 inline-block shadow-xs">
          {match}
        </mark>
        {after}
      </>
    );
  }

  // فحص مع التطبيع العربي
  const normText = normalizeArabic(text);
  const normIdx = normText.indexOf(qClean);
  if (normIdx !== -1) {
    // تقريب الموقع في النص الأصلي
    const start = Math.max(0, Math.min(normIdx, text.length));
    const end = Math.min(text.length, start + Math.max(1, qTrim.length));
    const before = text.slice(0, start);
    const match = text.slice(start, end);
    const after = text.slice(end);
    return (
      <>
        {before}
        <mark className="bg-amber-300 text-amber-950 font-black px-1 py-0.5 rounded ring-1 ring-amber-400 mx-0.5 inline-block shadow-xs">
          {match}
        </mark>
        {after}
      </>
    );
  }

  return <>{text}</>;
}
