import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClinicalNoteRecord } from "@/types/consultation";

interface ClinicalNotesHistoryProps {
  clinicalNotes: ClinicalNoteRecord[];
}

export function ClinicalNotesHistory({
  clinicalNotes,
}: ClinicalNotesHistoryProps) {
  return (
    <div className="mt-8">
      <h4 className="text-sm font-medium mb-4">Past Clinical Notes</h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Recorded By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clinicalNotes.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="whitespace-nowrap">
                {format(new Date(record.createdAt), "dd/MM/yyyy hh:mm a")}
              </TableCell>
              <TableCell>{record.notes}</TableCell>
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
