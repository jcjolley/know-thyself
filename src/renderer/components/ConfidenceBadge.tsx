import { getConfidenceColor } from '../styles/adminStyles';

interface ConfidenceBadgeProps {
    confidence: number;
    level: 'high' | 'medium' | 'low';
}

export function ConfidenceBadge({ confidence, level }: ConfidenceBadgeProps) {
    const color = getConfidenceColor(level);
    const percentage = Math.round(confidence * 100);

    // SVG circle calculations
    const size = 40;
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (confidence * circumference);
    const dashArray = `${progress} ${circumference}`;

    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg
                width={size}
                height={size}
                style={{
                    transform: 'rotate(-90deg)',
                    filter: level === 'high' ? `drop-shadow(0 0 4px ${color})` : 'none',
                }}
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth={strokeWidth}
                    strokeDasharray={level === 'low' ? '4 4' : 'none'}
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dashArray}
                    strokeLinecap="round"
                    style={{
                        transition: 'stroke-dasharray 0.3s ease-out',
                    }}
                />
            </svg>
            {/* Percentage text */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 600,
                    color: color,
                }}
            >
                {percentage}
            </div>
        </div>
    );
}
