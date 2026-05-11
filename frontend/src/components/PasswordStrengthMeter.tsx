import {
  checkPasswordStrength,
  scoreLabel,
  PasswordUserInfo,
} from '../utils/passwordStrength';

interface PasswordStrengthMeterProps {
  password: string;
  userInfo?: PasswordUserInfo;
  showIssues?: boolean;
}

export function PasswordStrengthMeter({
  password,
  userInfo,
  showIssues = true,
}: PasswordStrengthMeterProps) {
  if (!password) return null;

  const { score, issues } = checkPasswordStrength(password, userInfo);

  const colors = {
    weak: 'bg-red-500',
    medium: 'bg-amber-500',
    strong: 'bg-green-500',
  };

  const widths = {
    weak: 'w-1/3',
    medium: 'w-2/3',
    strong: 'w-full',
  };

  const textColors = {
    weak: 'text-red-700',
    medium: 'text-amber-700',
    strong: 'text-green-700',
  };

  return (
    <div className="mt-2">
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full ${colors[score]} ${widths[score]} transition-all`}
            aria-hidden="true"
          />
        </div>
        <span className={`text-xs font-medium ${textColors[score]} w-20 text-right`}>
          {scoreLabel(score)}
        </span>
      </div>

      {showIssues && issues.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {issues.map((issue, idx) => (
            <li key={idx} className="text-xs text-gray-600 flex items-start gap-1.5">
              <span className="text-red-500 mt-0.5">•</span>
              <span>{issue}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
