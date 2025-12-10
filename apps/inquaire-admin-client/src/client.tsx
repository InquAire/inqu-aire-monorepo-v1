import { StartClient } from '@tanstack/react-start/client';
import { hydrateRoot } from 'react-dom/client';

import '@/app/styles/app.css';

hydrateRoot(document, <StartClient />);
