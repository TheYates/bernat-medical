import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HistorySheetProps<T> {
  title: string;
  data: T[];
  columns: {
    header: string;
    cell: (item: T) => React.ReactNode;
    className?: string;
  }[];
  triggerButton?: React.ReactNode;
  isLoading?: boolean;
  emptyState?: string;
}

export function HistorySheet<T>({ 
  title, 
  data, 
  columns, 
  triggerButton,
  isLoading = false,
  emptyState = "No history found"
}: HistorySheetProps<T>) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {triggerButton || (
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" />
            View History
            {data.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {data.length}
              </Badge>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[640px]">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column, index) => (
                  <TableHead key={index} className={column.className}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell 
                    colSpan={columns.length} 
                    className="text-center h-24"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={columns.length} 
                    className="text-center h-24 text-muted-foreground"
                  >
                    {emptyState}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item, index) => (
                  <TableRow key={index}>
                    {columns.map((column, colIndex) => (
                      <TableCell key={colIndex} className={column.className}>
                        {column.cell(item)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
} 