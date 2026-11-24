import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'حدث خطأ غير متوقع في الاتصال أو البيانات.',
    };
  }

  componentDidCatch(error: Error): void {
    console.error('Application ErrorBoundary caught:', error);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-[#0b0d14] text-slate-100 p-6 text-center">
          <div className="max-w-sm w-full rounded-3xl bg-[#151824] border border-rose-500/40 p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-300">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-black text-white">تعذّر إكمال العملية</h2>
            <p className="text-xs text-slate-300 leading-relaxed break-words">
              تم حفظ تقدمك محلياً بأمان. يمكنك إعادة المحاولة أو تحديث الشاشة الآن.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>استئناف اللعب</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
