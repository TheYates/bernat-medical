import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { vitalSignsService } from '@/services/vital-signs.service';

interface VitalSignsTabProps {
  patient: any;
}

export function VitalSignsTab({ patient }: VitalSignsTabProps) {
  const [vitalSignsHistory, setVitalSignsHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    const fetchVitalSigns = async () => {
      if (!patient?.id) return;
      
      setIsLoadingHistory(true);
      try {
        // Use the same endpoint as VitalSigns.tsx
        const data = await vitalSignsService.getHistory(patient.id);
        setVitalSignsHistory(data);
      } catch (error) {
        console.error('Error fetching vital signs:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchVitalSigns();
  }, [patient?.id]);

  return (
    <Card>
      <CardContent className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Temperature</TableHead>
              <TableHead>Blood Pressure</TableHead>
              <TableHead>Pulse Rate</TableHead>
              <TableHead>SpO2</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Height</TableHead>
              <TableHead>Recorded By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingHistory ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Loading history...
                </TableCell>
              </TableRow>
            ) : vitalSignsHistory.length > 0 ? (
              vitalSignsHistory.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    {format(new Date(record.createdAt), "dd MMM yyyy hh:mm a")}
                  </TableCell>
                  <TableCell>
                    {record.temperatureC}°C / {record.temperatureF}°F
                  </TableCell>
                  <TableCell>
                    {record.systolic}/{record.diastolic} mmHg
                  </TableCell>
                  <TableCell>{record.pulseRate} bpm</TableCell>
                  <TableCell>{record.oxygenSaturation}%</TableCell>
                  <TableCell>{record.weight} kg</TableCell>
                  <TableCell>{record.height} cm</TableCell>
                  <TableCell>
                    {record.recordedBy.fullName}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No vital signs history found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
} 