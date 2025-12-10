/**
 * Organization Members Page
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router';
import {
  AlertCircle,
  Clock,
  Crown,
  Loader2,
  Mail,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCog,
  Users,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useProfile } from '@/entities/auth/hooks/queries/useProfile';
import {
  useCancelInvitation,
  useInviteMember,
  useOrganizationMembers,
  usePendingInvitations,
  useRemoveMember,
  useResendInvitation,
  useUpdateMemberRole,
} from '@/entities/organization';
import {
  type OrganizationRole,
  ROLE_DESCRIPTIONS,
  ROLE_DISPLAY_NAMES,
  useOrganization as useOrganizationContext,
} from '@/shared/lib/organization';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui';
import { PermissionGate } from '@/shared/ui/permission-gate';

export const Route = createFileRoute('/_layout/organization/members')({
  component: OrganizationMembersPage,
});

const inviteMemberSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력하세요.'),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'] as const),
});

type InviteMemberForm = z.infer<typeof inviteMemberSchema>;

const ASSIGNABLE_ROLES: OrganizationRole[] = ['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'];

function OrganizationMembersPage() {
  const { currentOrganization, currentRole } = useOrganizationContext();
  const { data: profile } = useProfile();
  const { data: members, isLoading } = useOrganizationMembers(currentOrganization?.id ?? '');
  const { data: pendingInvitations, isLoading: invitationsLoading } = usePendingInvitations(
    currentOrganization?.id ?? ''
  );
  const inviteMember = useInviteMember(currentOrganization?.id ?? '');
  const updateMemberRole = useUpdateMemberRole(currentOrganization?.id ?? '');
  const removeMember = useRemoveMember(currentOrganization?.id ?? '');
  const resendInvitation = useResendInvitation(currentOrganization?.id ?? '');
  const cancelInvitation = useCancelInvitation(currentOrganization?.id ?? '');

  const [searchQuery, setSearchQuery] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [cancelInviteDialogOpen, setCancelInviteDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<{
    id: string;
    email: string;
  } | null>(null);

  const form = useForm<InviteMemberForm>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: '',
      role: 'MEMBER',
    },
  });

  const filteredMembers = members?.filter(
    member =>
      member.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onInvite = (data: InviteMemberForm) => {
    inviteMember.mutate(
      { email: data.email, role: data.role },
      {
        onSuccess: () => {
          setInviteDialogOpen(false);
          form.reset();
        },
      }
    );
  };

  const handleRoleChange = (userId: string, role: OrganizationRole) => {
    updateMemberRole.mutate({ userId, role });
  };

  const handleRemoveMember = () => {
    if (!selectedMember) return;
    removeMember.mutate(selectedMember.userId, {
      onSuccess: () => {
        setRemoveDialogOpen(false);
        setSelectedMember(null);
      },
    });
  };

  const canChangeRole = (memberRole: OrganizationRole): boolean => {
    if (!currentRole) return false;
    // Owner can change all roles except their own
    if (currentRole === 'OWNER') return true;
    // Admin can change non-owner/admin roles
    if (currentRole === 'ADMIN' && memberRole !== 'OWNER' && memberRole !== 'ADMIN') return true;
    return false;
  };

  const canRemoveMember = (memberRole: OrganizationRole, memberId: string): boolean => {
    if (!currentRole || !profile) return false;
    // Can't remove yourself
    if (memberId === profile.id) return false;
    // Owner can remove anyone
    if (currentRole === 'OWNER') return true;
    // Admin can remove non-owner/admin members
    if (currentRole === 'ADMIN' && memberRole !== 'OWNER' && memberRole !== 'ADMIN') return true;
    return false;
  };

  if (!currentOrganization) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader
          title="멤버 관리"
          description="조직을 선택해주세요"
          icon={<Users className="h-6 w-6" />}
          breadcrumbs={[{ label: '조직 관리', href: '/organization' }, { label: '멤버 관리' }]}
        />
        <main className="p-8">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle>조직이 선택되지 않았습니다</CardTitle>
              <CardDescription>사이드바에서 조직을 선택해주세요.</CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="멤버 관리"
        description={`${currentOrganization.name} 조직의 멤버를 관리합니다`}
        icon={<Users className="h-6 w-6" />}
        breadcrumbs={[{ label: '조직 관리', href: '/organization' }, { label: '멤버 관리' }]}
        actions={
          <PermissionGate permission="member:invite">
            <Button onClick={() => setInviteDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              멤버 초대
            </Button>
          </PermissionGate>
        }
      />

      <main className="p-8">
        {/* Search */}
        <Card className="p-4 mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="이름 또는 이메일로 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {(['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'] as const).map(role => (
            <Card key={role} className="p-4">
              <div className="flex items-center gap-2">
                <RoleIcon role={role} />
                <span className="text-sm font-medium">{ROLE_DISPLAY_NAMES[role]}</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {members?.filter(m => m.role === role).length ?? 0}
              </p>
            </Card>
          ))}
        </div>

        {/* Pending Invitations */}
        {pendingInvitations && pendingInvitations.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                대기 중인 초대
              </CardTitle>
              <CardDescription>
                아직 수락되지 않은 초대 {pendingInvitations.length}건이 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invitationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="divide-y">
                  {pendingInvitations.map(invitation => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            <Mail className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{invitation.email}</p>
                            {invitation.is_expired && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                만료됨
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              만료: {new Date(invitation.expires_at).toLocaleDateString('ko-KR')}
                            </span>
                            {invitation.invited_by && (
                              <>
                                <span>•</span>
                                <span>초대자: {invitation.invited_by.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          <RoleIcon role={invitation.role} />
                          <span className="ml-1">{ROLE_DISPLAY_NAMES[invitation.role]}</span>
                        </Badge>
                        <PermissionGate permission="member:invite">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resendInvitation.mutate(invitation.id)}
                            disabled={resendInvitation.isPending}
                          >
                            {resendInvitation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                            <span className="ml-1">재전송</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedInvitation({
                                id: invitation.id,
                                email: invitation.email,
                              });
                              setCancelInviteDialogOpen(true);
                            }}
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </PermissionGate>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle>멤버 목록</CardTitle>
            <CardDescription>총 {members?.length ?? 0}명의 멤버가 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : !filteredMembers || filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? '검색 결과가 없습니다.' : '멤버가 없습니다.'}
              </div>
            ) : (
              <div className="divide-y">
                {filteredMembers.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.user.avatar_url ?? undefined} />
                        <AvatarFallback>{member.user.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.user.name}</p>
                          {member.user.id === profile?.id && (
                            <Badge variant="outline" className="text-xs">
                              나
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{member.user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <RoleIcon role={member.role} />
                        <Badge variant={member.role === 'OWNER' ? 'default' : 'secondary'}>
                          {ROLE_DISPLAY_NAMES[member.role]}
                        </Badge>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">작업 메뉴 열기</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>멤버 관리</DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          {canChangeRole(member.role) && (
                            <>
                              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                역할 변경
                              </DropdownMenuLabel>
                              <DropdownMenuRadioGroup
                                value={member.role}
                                onValueChange={value =>
                                  handleRoleChange(member.user.id, value as OrganizationRole)
                                }
                              >
                                {ASSIGNABLE_ROLES.map(role => (
                                  <DropdownMenuRadioItem key={role} value={role}>
                                    <div className="flex items-center gap-2">
                                      <RoleIcon role={role} />
                                      <span>{ROLE_DISPLAY_NAMES[role]}</span>
                                    </div>
                                  </DropdownMenuRadioItem>
                                ))}
                              </DropdownMenuRadioGroup>
                              <DropdownMenuSeparator />
                            </>
                          )}

                          {canRemoveMember(member.role, member.user.id) && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedMember({
                                  userId: member.user.id,
                                  name: member.user.name,
                                });
                                setRemoveDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              멤버 제거
                            </DropdownMenuItem>
                          )}

                          {!canChangeRole(member.role) &&
                            !canRemoveMember(member.role, member.user.id) && (
                              <DropdownMenuItem disabled>권한이 없습니다</DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>멤버 초대</DialogTitle>
            <DialogDescription>
              이메일 주소로 새로운 멤버를 초대합니다. 초대받은 사용자는 이메일로 초대 링크를 받게
              됩니다.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onInvite)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일 *</FormLabel>
                    <FormControl>
                      <Input placeholder="user@example.com" {...field} />
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
                          <SelectValue placeholder="역할 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ASSIGNABLE_ROLES.map(role => (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center gap-2">
                              <RoleIcon role={role} />
                              <span>{ROLE_DISPLAY_NAMES[role]}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {ROLE_DESCRIPTIONS[field.value as OrganizationRole]}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setInviteDialogOpen(false);
                    form.reset();
                  }}
                >
                  취소
                </Button>
                <Button type="submit" disabled={inviteMember.isPending}>
                  {inviteMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  초대 보내기
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>멤버 제거</DialogTitle>
            <DialogDescription>
              정말로 <strong>{selectedMember?.name}</strong>님을 조직에서 제거하시겠습니까? 이
              작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRemoveDialogOpen(false);
                setSelectedMember(null);
              }}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={removeMember.isPending}
            >
              {removeMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              제거
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Invitation Dialog */}
      <Dialog open={cancelInviteDialogOpen} onOpenChange={setCancelInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>초대 취소</DialogTitle>
            <DialogDescription>
              정말로 <strong>{selectedInvitation?.email}</strong>에게 보낸 초대를 취소하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelInviteDialogOpen(false);
                setSelectedInvitation(null);
              }}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedInvitation) {
                  cancelInvitation.mutate(selectedInvitation.id, {
                    onSuccess: () => {
                      setCancelInviteDialogOpen(false);
                      setSelectedInvitation(null);
                    },
                  });
                }
              }}
              disabled={cancelInvitation.isPending}
            >
              {cancelInvitation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              초대 취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoleIcon({ role }: { role: OrganizationRole }) {
  switch (role) {
    case 'OWNER':
      return <Crown className="h-4 w-4 text-yellow-500" />;
    case 'ADMIN':
      return <Shield className="h-4 w-4 text-blue-500" />;
    case 'MANAGER':
      return <UserCog className="h-4 w-4 text-green-500" />;
    case 'MEMBER':
      return <Users className="h-4 w-4 text-gray-500" />;
    case 'VIEWER':
      return <Users className="h-4 w-4 text-gray-400" />;
    default:
      return null;
  }
}
