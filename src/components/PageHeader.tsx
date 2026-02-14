import { useNavigate, useLocation } from 'react-router-dom';

const PageHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome =
    location.pathname === '/dashboard' || location.pathname === '/home';

  return (
    <div className="flex items-center gap-3 mb-4">
      {!isHome && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#FDFBF7] border border-gray-100 flex-shrink-0"
        >
          <span className="text-gray-600" aria-hidden>←</span>
        </button>
      )}
      {isHome && <span className="text-2xl" aria-hidden>🍽️</span>}
      <div className="flex-1">
        <h1 className="font-serif text-xl font-bold text-gray-800">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      {!isHome && (
        <button
          type="button"
          onClick={() => navigate('/home')}
          aria-label="Go to home"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#FDFBF7] border border-gray-100 flex-shrink-0"
        >
          <span className="text-gray-600" aria-hidden>🏠</span>
        </button>
      )}
    </div>
  );
};

export default PageHeader;
