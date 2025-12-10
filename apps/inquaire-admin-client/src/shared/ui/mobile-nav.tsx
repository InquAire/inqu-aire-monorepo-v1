import { Link, useLocation } from '@tanstack/react-router';
import { Menu } from 'lucide-react';
import { useState } from 'react';

import { Button } from './button';
import { Separator } from './separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './sheet';

import { cn } from '@/shared/lib/utils';

interface MobileNavProps {
  items: Array<{
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
  title?: string;
  logo?: React.ReactNode;
}

/**
 * 모바일 네비게이션 컴포넌트
 *
 * 사용법:
 * <MobileNav items={navItems} title="InquAire" />
 */
export function MobileNav({ items, title = 'Navigation', logo }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="메뉴 열기">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="p-4">
          {logo ? (
            <div className="flex items-center gap-2">
              {logo}
              <SheetTitle>{title}</SheetTitle>
            </div>
          ) : (
            <SheetTitle>{title}</SheetTitle>
          )}
        </SheetHeader>
        <Separator />
        <nav className="flex flex-col gap-1 p-4">
          {items.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
