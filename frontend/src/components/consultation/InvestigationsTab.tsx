import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { PatientDetails } from '@/components/shared/patient-details';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { investigationsService } from '@/services/investigations.service';

interface Investigation {
  id: string;
  date: string;
  test: string;
  result: string;
  range?: string;
  status: string;
  recordedBy: {
    firstName: string;
    lastName: string;
  };
}

interface InvestigationsTabProps {
  patient: any;
}

export function InvestigationsTab({ patient }: InvestigationsTabProps) {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!patient?.id) return;

    const fetchInvestigations = async () => {
      setIsLoading(true);
      try {
        const data = await investigationsService.getHistory(patient.id);
        setInvestigations(data);
      } catch (error) {
        console.error('Error fetching investigations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvestigations();
  }, [patient?.id]);

  return (
    <div className="space-y-4">
    
      {/* Investigations Table */}
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div>Loading investigations...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recorded By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investigations.length > 0 ? (
                  investigations.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{record.test}</TableCell>
                      <TableCell>{record.result}</TableCell>
                      <TableCell>{record.range || "-"}</TableCell>
                      <TableCell>{record.status}</TableCell>
                      <TableCell>
                        {record.recordedBy.firstName} {record.recordedBy.lastName}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground"
                    >
                      No investigations found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 