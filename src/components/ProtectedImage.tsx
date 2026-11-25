import type { ImgHTMLAttributes } from 'react';

interface ProtectedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
  shield?: boolean;
}

/**
 * Displays a content/avatar image with deterrent browser protections:
 * - `draggable={false}` and WebKit drag/callout suppression
 * - optional transparent shield overlay (`shield=true`) that intercepts long-press
 *   and context-menu hit testing without altering the image look or blocking clicks
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
    <span className={wrapperClassName}>
      <img
        {...rest}
        alt={alt}
        draggable={false}
        className={`select-none ${shield ? 'pointer-events-none' : ''} ${className}`.trim()}
      />
      {shield && (
        <span
          aria-hidden="true"
          data-protected-media="true"
          className="content-image-shield"
        />
      )}
    </span>
  );
}
