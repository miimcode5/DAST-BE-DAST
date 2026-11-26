import type { ImgHTMLAttributes } from 'react';

interface ProtectedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
  shield?: boolean;
}

/**
 * Displays a content/avatar image with deterrent browser protections:
 * - `draggable={false}` and WebKit drag/callout suppression
 * - transparent visual shield overlay (`shield=true` by default) that intercepts
 *   desktop right-click and mobile long-press hit testing without altering the image look
 *   or blocking parent buttons/links
 * - keeps `alt` completely accessible to screen readers
 */
export function ProtectedImage({
  wrapperClassName = 'relative block overflow-hidden',
  className = '',
  shield = true,
  alt = '',
  ...rest
}: ProtectedImageProps) {
  return (
    <span
      className={wrapperClassName}
      onContextMenu={shield ? (e) => e.preventDefault() : undefined}
      onDragStart={shield ? (e) => e.preventDefault() : undefined}
    >
      <img
        {...rest}
        alt={alt}
        draggable={false}
        className={`${shield ? 'pointer-events-none select-none' : ''} ${className}`.trim()}
      />
      {shield && (
        <span
          aria-hidden="true"
          data-protected-media="true"
          className="content-image-shield"
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        />
      )}
    </span>
  );
}
