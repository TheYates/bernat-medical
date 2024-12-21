import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserActions } from './UserActions';
import type { User } from '@/types/user';

interface UserTableProps {
  users: User[];
  isLoading: boolean;
  onUserUpdated: () => void;
}

export function UserTable({ users, isLoading, onUserUpdated }: UserTableProps) {
  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Username</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Access</TableHead>
          <TableHead className="w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.fullName}</TableCell>
            <TableCell>{user.username}</TableCell>
            <TableCell>
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                {user.role}
              </Badge>
            </TableCell>
            <TableCell>
              {user.access?.map((item) => (
                <Badge key={item} variant="outline" className="mr-1 capitalize">
                  {item}
                </Badge>
              ))}
            </TableCell>
            <TableCell>
              <UserActions user={user} onUserUpdated={onUserUpdated} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
} 