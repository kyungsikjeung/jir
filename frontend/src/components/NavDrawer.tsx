import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}

/**
 * 네비게이션 드로어 (navigation-drawer 가이드)
 * - modal <dialog> + showModal(): 포커스 트랩·Escape·포커스 복원 자동
 * - 스크롤 스냅 스크롤러: swipe 제스처는 브라우저가 처리
 * - IntersectionObserver가 열림/닫힘의 유일한 진실 원천
 * - 백드롭 opacity는 스크롤 드리븐 애니메이션 (CSS @supports 게이트)
 */
export default function NavDrawer({ open, onClose, label, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    const scroller = scrollerRef.current;
    const sheet = sheetRef.current;
    if (!dialog || !scroller || !sheet) return;

    // 중첩 함수에서도 null이 아님을 유지하기 위한 별칭
    const dialogEl: HTMLDialogElement = dialog;
    const scrollerEl: HTMLDivElement = scroller;

    // 스크롤이 끝난 위치로 열림/닫힘을 판정한다.
    // (초기 위치 이동 중 발생하는 scrollend는 무시)
    let ready = true;
    let settleTimer = 0;
    const settle = () => {
      window.clearTimeout(settleTimer);
      settleTimer = 0;
      if (!dialogEl.open || !ready) return;
      const closed = scrollerEl.scrollLeft > scrollerEl.offsetWidth * 0.5;
      if (closed) {
        dialogEl.close();
        onCloseRef.current();
      }
    };
    const onScroll = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, 140);
    };
    const onScrollEnd = () => settle();

    const onDialogClick = (event: MouseEvent) => {
      if (!sheet.contains(event.target as Node)) closeDrawer();
    };
    const onCancel = (event: Event) => {
      // Esc: 즉시 종료 대신 슬라이드아웃 후 종료
      if (event.cancelable) {
        event.preventDefault();
        closeDrawer();
      }
    };

    function openDrawer() {
      ready = false;
      dialogEl.showModal();
      // 닫힌 위치(오른쪽 끝)에서 시작한 뒤 다음 프레임에 열린 위치로 이동
      scrollerEl.scrollTo({ left: scrollerEl.offsetWidth, behavior: 'instant' as ScrollBehavior });
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          scrollerEl.scrollTo({ left: 0, behavior: 'instant' as ScrollBehavior });
          ready = true;
          window.clearTimeout(settleTimer);
          settleTimer = 0;
        }),
      );
    }

    function closeDrawer() {
      scrollerEl.scrollTo({ left: scrollerEl.offsetWidth, behavior: 'instant' as ScrollBehavior });
    }

    dialog.addEventListener('click', onDialogClick);
    dialog.addEventListener('cancel', onCancel);
    scroller.addEventListener('scroll', onScroll, { passive: true });
    scroller.addEventListener('scrollend', onScrollEnd);

    if (open && !dialog.open) openDrawer();
    if (!open && dialog.open) closeDrawer();

    return () => {
      window.clearTimeout(settleTimer);
      dialog.removeEventListener('click', onDialogClick);
      dialog.removeEventListener('cancel', onCancel);
      scroller.removeEventListener('scroll', onScroll);
      scroller.removeEventListener('scrollend', onScrollEnd);
    };
  }, [open]);

  return (
    <dialog ref={dialogRef} className="Drawer" aria-label={label}>
      <div ref={scrollerRef} className="Drawer-scroller">
        <nav ref={sheetRef} className="Drawer-sheet" aria-label={label}>
          {children}
        </nav>
      </div>
    </dialog>
  );
}
