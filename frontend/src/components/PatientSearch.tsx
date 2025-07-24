import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

interface Patient {
  id: number;
  firstName: string;
  middleName: string;
  lastName: string;
  clinicId: string;
  gender: string;
  contact: string;
  maritalStatus: string;
  lastVisit: string;
}

const PatientSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [filters, setFilters] = useState({
    gender: "any",
    ageRange: "any",
    maritalStatus: "any",
    lastVisit: "any",
  });

  const handleSearch = async () => {
    try {
      const response = await api.get("/patients/search", {
        params: { searchTerm, ...filters },
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error("Error searching patients:", error);
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Search by name, clinic ID, or contact..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (e.target.value.length >= 3) handleSearch();
          }}
          className="w-full"
        />
      </div>

      <div className="flex flex-wrap gap-6 mb-4">
        <div className="flex flex-col space-y-1 w-48">
          <label className="text-sm font-medium">Gender</label>
          <Select
            value={filters.gender}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, gender: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-1 w-48">
          <label className="text-sm font-medium">Age Range</label>
          <Select
            value={filters.ageRange}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, ageRange: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Age Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="0-17">Under 18</SelectItem>
              <SelectItem value="18-30">18-30</SelectItem>
              <SelectItem value="31-50">31-50</SelectItem>
              <SelectItem value="51+">Over 50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-1 w-48">
          <label className="text-sm font-medium">Marital Status</label>
          <Select
            value={filters.maritalStatus}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, maritalStatus: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Marital Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="Single">Single</SelectItem>
              <SelectItem value="Married">Married</SelectItem>
              <SelectItem value="Divorced">Divorced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-1 w-48">
          <label className="text-sm font-medium">Last Visit</label>
          <Select
            value={filters.lastVisit}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, lastVisit: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Last Visit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Clinic ID</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Marital Status</TableHead>
            <TableHead>Last Visit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {searchResults.map((patient) => (
            <TableRow key={patient.id}>
              <TableCell>
                {patient.firstName} {patient.middleName} {patient.lastName}
              </TableCell>
              <TableCell>{patient.clinicId}</TableCell>
              <TableCell>{patient.gender}</TableCell>
              <TableCell>{patient.contact}</TableCell>
              <TableCell>{patient.maritalStatus || "-"}</TableCell>
              <TableCell>{patient.lastVisit || "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PatientSearch;
