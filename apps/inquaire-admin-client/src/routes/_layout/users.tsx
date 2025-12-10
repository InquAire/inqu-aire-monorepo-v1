import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router';
import { type ColumnDef } from '@tanstack/react-table';
import {
  Download,
  MoreVertical,
  Shield,
  ShieldCheck,
  ShieldX,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  useCreateUser,
  useDeleteUser,
  UserRole,
  userSchema,
  useUpdateUserRole,
  useUsers,
  useUserStats,
  type User,
  type UserFormData,
} from '@/entities/user';
import { getErrorMessage } from '@/shared/lib';
import { exportToFile, transformUsersForExport } from '@/shared/lib/export';
import { Badge, Button, Card, FilterBar, type FilterConfig, Input, PageHeader, StatsCard, StatsGrid } from '@/shared/ui';
import { DataTable, DataTableColumnHeader } from '@/shared/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

export const Route = createFileRoute('/_layout/users')({
  component: UsersPage,
});

// 역할별 정보
const ROLE_INFO = {
  [UserRole.USER]: { label: '사용자', color: 'bg-gray-100 text-gray-800', icon: Shield },
  [UserRole.ADMIN]: { label: '관리자', color: 'bg-blue-100 text-blue-800', icon: ShieldCheck },
  [UserRole.SUPER_ADMIN]: {
    label: '슈퍼 관리자',
    color: 'bg-purple-100 text-purple-800',
    icon: ShieldX,
  },
};

function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleClearFilters = () => {
    setSearchQuery('');
    setRoleFilter('');
  };

  const { data: usersData, isLoading } = useUsers({});
  const { data: stats } = useUserStats();

  // Filter users
  const users = useMemo(() => {
    return (usersData?.data ?? []).filter(user => {
      const matchesSearch =
        !searchQuery ||
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = !roleFilter || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [usersData?.data, searchQuery, roleFilter]);
  const createUser = useCreateUser();
  const updateUserRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: UserRole.USER,
    },
  });

  const handleAddUser = (data: UserFormData) => {
    createUser.mutate(data, {
      onSuccess: () => {
        toast.success('사용자가 생성되었습니다');
        setShowAddDialog(false);
        form.reset();
      },
      onError: error => {
        toast.error('사용자 생성 실패', {
          description: getErrorMessage(error),
        });
      },
    });
  };

  const handleRoleChange = useCallback(
    (userId: string, role: UserRole) => {
      updateUserRole.mutate(
        { id: userId, data: { role } },
        {
          onSuccess: () => {
            toast.success('사용자 역할이 변경되었습니다');
          },
          onError: error => {
            toast.error('역할 변경 실패', {
              description: getErrorMessage(error),
            });
          },
        }
      );
    },
    [updateUserRole]
  );

  const handleDeleteUser = () => {
    if (!selectedUserId) return;

    deleteUser.mutate(selectedUserId, {
      onSuccess: () => {
        toast.success('사용자가 삭제되었습니다');
        setShowDeleteDialog(false);
        setSelectedUserId(null);
      },
      onError: error => {
        toast.error('사용자 삭제 실패', {
          description: getErrorMessage(error),
        });
      },
    });
  };

  // TanStack Table columns definition
  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="이름" />,
        cell: ({ row }) => <p className="font-medium text-foreground">{row.original.name}</p>,
      },
      {
        accessorKey: 'email',
        header: ({ column }) => <DataTableColumnHeader column={column} title="이메일" />,
        cell: ({ row }) => <p className="text-muted-foreground">{row.original.email}</p>,
      },
      {
        accessorKey: 'role',
        header: ({ column }) => <DataTableColumnHeader column={column} title="역할" />,
        cell: ({ row }) => {
          const user = row.original;
          return (
            <Select
              value={user.role}
              onValueChange={(value: UserRole) => handleRoleChange(user.id, value)}
            >
              <SelectTrigger className="w-36">
                <Badge className={ROLE_INFO[user.role].color}>{ROLE_INFO[user.role].label}</Badge>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UserRole.USER}>사용자</SelectItem>
                <SelectItem value={UserRole.ADMIN}>관리자</SelectItem>
                <SelectItem value={UserRole.SUPER_ADMIN}>슈퍼 관리자</SelectItem>
              </SelectContent>
            </Select>
          );
        },
      },
      {
        accessorKey: 'last_login_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="마지막 로그인" />,
        cell: ({ row }) => (
          <p className="text-muted-foreground">
            {row.original.last_login_at
              ? new Date(row.original.last_login_at).toLocaleDateString('ko-KR')
              : '-'}
          </p>
        ),
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="가입일" />,
        cell: ({ row }) => (
          <p className="text-muted-foreground">
            {new Date(row.original.created_at).toLocaleDateString('ko-KR')}
          </p>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">작업</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">작업 메뉴 열기</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>작업</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    setSelectedUserId(row.original.id);
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [handleRoleChange]
  );

  const handleExport = (format: 'xlsx' | 'csv') => {
    if (!usersData || usersData.data.length === 0) {
      toast.error('내보낼 데이터가 없습니다');
      return;
    }

    try {
      const transformedData = transformUsersForExport(usersData.data);
      exportToFile(transformedData, {
        filename: `사용자목록_${new Date().toISOString().split('T')[0]}`,
        format,
      });
      toast.success(`${format.toUpperCase()} 파일이 다운로드되었습니다`);
    } catch (error) {
      toast.error('내보내기 실패', {
        description: getErrorMessage(error),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="사용자 관리"
        description="시스템 사용자를 관리하고 권한을 부여합니다"
        icon={<Shield className="h-6 w-6" />}
        breadcrumbs={[{ label: '사용자 관리' }]}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  내보내기
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')}>CSV (.csv)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setShowAddDialog(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              사용자 추가
            </Button>
          </>
        }
      />

      {/* Content */}
      <main className="p-8">
        {/* Stats Cards */}
        <StatsGrid>
          <StatsCard
            label="전체 사용자"
            value={stats?.total ?? 0}
            icon={Users}
            variant="primary"
            loading={isLoading}
          />
          {stats?.by_role.map(item => {
            const roleInfo = ROLE_INFO[item.role];
            const variants: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
              [UserRole.USER]: 'default',
              [UserRole.ADMIN]: 'warning',
              [UserRole.SUPER_ADMIN]: 'danger',
            };
            return (
              <StatsCard
                key={item.role}
                label={roleInfo.label}
                value={item._count}
                icon={roleInfo.icon}
                variant={variants[item.role] ?? 'default'}
                loading={isLoading}
              />
            );
          })}
        </StatsGrid>

        {/* FilterBar */}
        <Card className="p-4 mb-6 border-0 shadow-none">
          <FilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="이름, 이메일로 검색..."
            filters={
              [
                {
                  key: 'role',
                  label: '역할',
                  type: 'select',
                  options: [
                    { value: UserRole.USER, label: '사용자' },
                    { value: UserRole.ADMIN, label: '관리자' },
                    { value: UserRole.SUPER_ADMIN, label: '슈퍼 관리자' },
                  ],
                },
              ] as FilterConfig[]
            }
            filterValues={{
              role: roleFilter,
            }}
            onFilterChange={(key, value) => {
              if (key === 'role') setRoleFilter(value as string);
            }}
            onClearAll={handleClearFilters}
          />
        </Card>

        {/* DataTable */}
        <Card className="p-0 border-0 shadow-none">
          <DataTable
            columns={columns}
            data={users}
            loading={isLoading}
            emptyMessage="사용자가 없습니다"
          />
        </Card>
      </main>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 사용자 추가</DialogTitle>
            <DialogDescription>새로운 시스템 사용자를 생성합니다</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddUser)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비밀번호</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>역할</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={UserRole.USER}>사용자</SelectItem>
                        <SelectItem value={UserRole.ADMIN}>관리자</SelectItem>
                        <SelectItem value={UserRole.SUPER_ADMIN}>슈퍼 관리자</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  취소
                </Button>
                <Button type="submit" disabled={createUser.isPending}>
                  {createUser.isPending ? '생성 중...' : '생성'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사용자 삭제 확인</DialogTitle>
            <DialogDescription>
              정말로 이 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
