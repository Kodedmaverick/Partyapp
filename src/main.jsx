import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import '@fontsource/caveat-brush/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
import './styles.css';
import Welcome from './views/Welcome.jsx';
import Host from './views/Host.jsx';
import Screen from './views/Screen.jsx';
import Phone from './views/Phone.jsx';

function App() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => { const f = () => setPath(location.pathname); addEventListener('popstate', f); return () => removeEventListener('popstate', f); }, []);
  const go = p => { history.pushState(null, '', p); setPath(p); };
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'host') return <Host />;
  if (parts[0] === 'screen') return <Screen code={parts[1] || ''} />;
  if (parts[0] === 'j') return <Phone initialCode={parts[1] || ''} />;
  return <Welcome go={go} />;
}

createRoot(document.getElementById('root')).render(<App />);
