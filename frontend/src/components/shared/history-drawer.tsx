import { format } from 'date-fns';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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

interface HistoryDrawerProps<T> {
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

export function HistoryDrawer<T>({ 
  title, 
  data, 
  columns, 
  triggerButton,
  isLoading = false,
  emptyState = "No history found"
}: HistoryDrawerProps<T>) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
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
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-4xl">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <div className="p-4">
            <ScrollArea className="h-[calc(100vh-12rem)]">
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
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
} 