import { Toaster as SonnerToaster } from 'sonner';

/**
 * Global Toast Notification Component
 * Production-ready toast with Sonner
 *
 * Usage:
 * import { toast } from 'sonner';
 * toast.success('Success message');
 * toast.error('Error message');
 * toast.warning('Warning message');
 * toast.info('Info message');
 * toast.promise(promise, { loading: 'Loading...', success: 'Done!', error: 'Failed' });
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'border bg-white dark:bg-gray-800',
          title: 'text-gray-900 dark:text-gray-100',
          description: 'text-gray-600 dark:text-gray-400',
          actionButton: 'bg-blue-600 text-white',
          cancelButton: 'bg-gray-200 text-gray-800',
          closeButton: 'bg-white dark:bg-gray-800',
          error: 'border-red-500 bg-red-50 dark:bg-red-950',
          success: 'border-green-500 bg-green-50 dark:bg-green-950',
          warning: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950',
          info: 'border-blue-500 bg-blue-50 dark:bg-blue-950',
        },
      }}
      richColors
      closeButton
      expand
    />
  );
}
