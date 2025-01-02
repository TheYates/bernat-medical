import { VitalSigns } from "@/services/vital-signs.service";
import { calculateBMI } from "@/lib/utils";
import { format } from "date-fns";

interface TodayVitalSignsDisplayProps {
  vitalSigns?: VitalSigns | null;
}

export function TodayVitalSignsDisplay({
  vitalSigns,
}: TodayVitalSignsDisplayProps) {
  if (!vitalSigns) {
    return (
      <div className="mt-4 bg-muted/50 p-4 rounded-lg text-center text-muted-foreground">
        No vital signs recorded today
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 mt-4 bg-muted/50 p-4 rounded-lg">
      <div>
        <p className="text-sm text-muted-foreground">Blood Pressure</p>
        <p className="font-medium">
          {vitalSigns.systolic}/{vitalSigns.diastolic} mmHg
        </p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Temperature</p>
        <p className="font-medium">
          {vitalSigns.temperatureC}°C / {vitalSigns.temperatureF}°F
        </p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Pulse Rate</p>
        <p className="font-medium">{vitalSigns.pulseRate} bpm</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Respiratory Rate</p>
        <p className="font-medium">{vitalSigns.respiratoryRate} bpm</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">SpO2</p>
        <p className="font-medium">{vitalSigns.oxygenSaturation}%</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Weight</p>
        <p className="font-medium">{vitalSigns.weight} kg</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Height</p>
        <p className="font-medium">{vitalSigns.height} cm</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">BMI</p>
        <p className="font-medium">
          {calculateBMI(
            vitalSigns.weight.toString(),
            vitalSigns.height.toString()
          )}
        </p>
      </div>
      {vitalSigns.fbs && (
        <div>
          <p className="text-sm text-muted-foreground">FBS</p>
          <p className="font-medium">{vitalSigns.fbs} mmol/L</p>
        </div>
      )}
      {vitalSigns.rbs && (
        <div>
          <p className="text-sm text-muted-foreground">RBS</p>
          <p className="font-medium">{vitalSigns.rbs} mmol/L</p>
        </div>
      )}
      {vitalSigns.fhr && (
        <div>
          <p className="text-sm text-muted-foreground">FHR</p>
          <p className="font-medium">{vitalSigns.fhr} bpm</p>
        </div>
      )}
    </div>
  );
}
