import { useNavigate, useLocation } from 'react-router-dom';

const PageHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome =
    location.pathname === '/dashboard' || location.pathname === '/home';

  // Determine safe back behavior — avoid going back to loading/scan flow
  const handleBack = () => {
    const dangerousPaths = ['/scan/', '/meal-correction', '/portion-confirm', '/results'];
    const fromScanFlow = dangerousPaths.some((p) => location.pathname.startsWith(p));
    if (fromScanFlow) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="flex items-center gap-3 mb-4">
      {!isHome && (
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          className="w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0"
          style={{ backgroundColor: '#ffffff', border: '1px solid #e8e2d8' }}
        >
          <span style={{ color: '#6ab08c' }} aria-hidden>←</span>
        </button>
      )}
      {isHome && <span className="text-2xl" aria-hidden>🍽️</span>}
      <div className="flex-1">
        <h1 className="font-serif text-xl font-bold" style={{ color: '#143628' }}>{title}</h1>
        {subtitle && <p className="text-xs" style={{ color: '#7a8c7e' }}>{subtitle}</p>}
      </div>
      {!isHome && (
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          aria-label="Go to home"
          className="w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0"
          style={{ backgroundColor: '#ffffff', border: '1px solid #e8e2d8' }}
        >
          <span style={{ color: '#6ab08c' }} aria-hidden>🏠</span>
        </button>
      )}
    </div>
  );
};

export default PageHeader;
