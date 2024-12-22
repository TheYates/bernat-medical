import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface AuditLog {
  id: number;
  username: string;
  full_name: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  details: any;
  ip_address: string;
  created_at: string;
}

interface AuditLogTableProps {
  logs: AuditLog[];
  isLoading: boolean;
}

export function AuditLogTable({ logs, isLoading }: AuditLogTableProps) {
  if (isLoading) {
    return <div>Loading...</div>;
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'success';
      case 'update': return 'default';
      case 'delete': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Details</TableHead>
          <TableHead>IP Address</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="whitespace-nowrap">
              {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
            </TableCell>
            <TableCell>{log.full_name}</TableCell>
            <TableCell>
              <Badge variant={getActionColor(log.action_type)}>
                {log.action_type}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="font-medium">{log.entity_type}</div>
              <div className="text-sm text-muted-foreground">{log.entity_id}</div>
            </TableCell>
            <TableCell>
              <pre className="text-sm">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </TableCell>
            <TableCell className="font-mono">{log.ip_address}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
} 