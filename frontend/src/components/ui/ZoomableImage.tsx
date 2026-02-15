import { useRef, useState, useCallback } from 'react';
import { clsx } from 'clsx';

// Custom SVG cursors encoded as data URIs
const ZOOM_IN_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='13' cy='13' r='10' fill='none' stroke='%23000' stroke-width='2'/%3E%3Cline x1='20' y1='20' x2='29' y2='29' stroke='%23000' stroke-width='2.5' stroke-linecap='round'/%3E%3Cline x1='9' y1='13' x2='17' y2='13' stroke='%23000' stroke-width='1.5' stroke-linecap='round'/%3E%3Cline x1='13' y1='9' x2='13' y2='17' stroke='%23000' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E") 13 13, zoom-in`;

const ZOOM_ACTIVE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='%23000' stroke-width='1.5'/%3E%3Ccircle cx='16' cy='16' r='2' fill='%23000'/%3E%3C/svg%3E") 16 16, crosshair`;

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  scale?: number;
  onClick?: () => void;
  loading?: 'eager' | 'lazy';
}

export default function ZoomableImage({
  src,
  alt,
  className,
  imgClassName,
  scale = 2,
  onClick,
  loading,
}: ZoomableImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin({ x, y });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setOrigin({ x: 50, y: 50 });
  }, []);

  return (
    <div
      ref={containerRef}
      className={clsx('overflow-hidden', className)}
      style={{ cursor: isHovered ? ZOOM_ACTIVE_CURSOR : ZOOM_IN_CURSOR }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={clsx(
          'w-full h-full transition-transform',
          isHovered ? 'duration-100' : 'duration-300',
          !imgClassName?.includes('object-') && 'object-cover',
          imgClassName
        )}
        style={{
          transform: isHovered ? `scale(${scale})` : 'scale(1)',
          transformOrigin: `${origin.x}% ${origin.y}%`,
        }}
        draggable={false}
      />
    </div>
  );
}
