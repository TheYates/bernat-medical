import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ComplaintRecord } from "@/types/consultation";

interface ComplaintsHistoryProps {
  complaints: ComplaintRecord[];
}

export function ComplaintsHistory({ complaints }: ComplaintsHistoryProps) {
  return (
    <div className="mt-8">
      <h4 className="text-sm font-medium mb-4">Past Complaints</h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Complaints</TableHead>
            <TableHead>Recorded By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {complaints.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="whitespace-nowrap">
                {format(new Date(record.createdAt), "dd/MM/yyyy hh:mm a")}
              </TableCell>
              <TableCell>{record.description}</TableCell>
              <TableCell>
                {record.recordedBy.firstName} {record.recordedBy.lastName}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
