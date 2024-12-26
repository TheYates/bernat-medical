import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TreatmentRecord } from "@/types/consultation";

interface TreatmentHistoryProps {
  treatmentPlans: TreatmentRecord[];
}

export function TreatmentHistory({ treatmentPlans }: TreatmentHistoryProps) {
  return (
    <div className="mt-8">
      <h4 className="text-sm font-medium mb-4">Past Treatment Plans</h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Recorded By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {treatmentPlans.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="whitespace-nowrap">
                {format(new Date(record.createdAt), "dd/MM/yyyy hh:mm a")}
              </TableCell>
              <TableCell>{record.plan}</TableCell>
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
