import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface HistoryItem {
  id: number;
  content: string;
  createdAt: string;
  createdBy: {
    fullName: string;
  };
  consultationId: number;
}

interface ConsultationHistoryProps {
  title: string;
  items: HistoryItem[];
  isLoading?: boolean;
  patientId?: number;
}

export function ConsultationHistory({ title, items, isLoading = false, patientId }: ConsultationHistoryProps) {
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showAllOpen, setShowAllOpen] = useState(false);
  const [consultationDetails, setConsultationDetails] = useState<{
    complaints?: string;
    clinicalNotes?: string;
    diagnosis?: string;
    treatment?: string;
    createdAt: string;
    createdBy: { fullName: string };
  } | null>(null);

  useEffect(() => {
    if (selectedItem?.consultationId && dialogOpen) {
      api.get(`/consultations/${patientId}/details/${selectedItem.consultationId}`)
        .then(response => setConsultationDetails(response.data))
        .catch(error => console.error('Error fetching consultation details:', error));
    }
  }, [selectedItem?.consultationId, dialogOpen, patientId]);

  // Show only the latest 5 items
  const displayedItems = items.slice(0, 5);
  const hasMoreItems = items.length > 5;

  return (
    <div className="mt-4">
      <h4 className="font-medium mb-4">{title} History</h4>
      {isLoading ? (
        <div className="text-center py-4 text-muted-foreground">
          Loading history...
        </div>
      ) : items.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Recorded By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedItems.map((item) => (
                <TableRow 
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    setSelectedItem(item);
                    setDialogOpen(true);
                  }}
                >
                  <TableCell>{format(new Date(item.createdAt), "dd MMM yyyy")}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{item.content}</TableCell>
                  <TableCell>{item.createdBy.fullName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {hasMoreItems && (
            <div className="mt-2 flex justify-end">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowAllOpen(true)}
              >
                View All History
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          No history found
        </div>
      )}

      {/* Updated Dialog for single item view with tabs */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Consultation on {selectedItem && format(new Date(selectedItem.createdAt), "dd MMM yyyy")}
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue={title.toLowerCase()} className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="complaints">Complaints</TabsTrigger>
              <TabsTrigger value="clinical notes">Clinical Notes</TabsTrigger>
              <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
              <TabsTrigger value="treatment plan">Treatment Plan</TabsTrigger>
            </TabsList>
            <TabsContent value="complaints" className="mt-4 space-y-4">
              <p className="text-sm whitespace-pre-wrap">{consultationDetails?.complaints || 'No complaints recorded'}</p>
            </TabsContent>
            <TabsContent value="clinical notes" className="mt-4 space-y-4">
              <p className="text-sm whitespace-pre-wrap">{consultationDetails?.clinicalNotes || 'No clinical notes recorded'}</p>
            </TabsContent>
            <TabsContent value="diagnosis" className="mt-4 space-y-4">
              <p className="text-sm whitespace-pre-wrap">{consultationDetails?.diagnosis || 'No diagnosis recorded'}</p>
            </TabsContent>
            <TabsContent value="treatment plan" className="mt-4 space-y-4">
              <p className="text-sm whitespace-pre-wrap">{consultationDetails?.treatment || 'No treatment plan recorded'}</p>
            </TabsContent>
          </Tabs>
          <div className="mt-4 text-xs text-muted-foreground">
            Recorded by {consultationDetails?.createdBy.fullName} on{" "}
            {consultationDetails && format(new Date(consultationDetails.createdAt), "dd MMM yyyy 'at' h:mm a")}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for viewing all history */}
      <Dialog open={showAllOpen} onOpenChange={setShowAllOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{title} History</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[500px] mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Recorded By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow 
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedItem(item);
                      setShowAllOpen(false);
                      setDialogOpen(true);
                    }}
                  >
                    <TableCell>{format(new Date(item.createdAt), "dd MMM yyyy")}</TableCell>
                    <TableCell className="max-w-[400px] truncate">{item.content}</TableCell>
                    <TableCell>{item.createdBy.fullName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
} 