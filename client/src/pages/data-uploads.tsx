import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Users,
  Package,
  FolderTree,
  ShoppingCart,
  HelpCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DataUpload {
  id: number;
  uploadType: string;
  fileName: string;
  rowCount: number | null;
  status: string;
  errorMessage: string | null;
  uploadedBy: string | null;
  uploadedAt: string;
}

const uploadTypes = [
  {
    id: "accounts",
    label: "Accounts",
    description: "Customer accounts with segment and TM assignment",
    icon: Users,
    fields: ["id", "name", "segment", "region", "assigned_tm", "status"],
  },
  {
    id: "products",
    label: "Products",
    description: "Product catalog with SKUs and categories",
    icon: Package,
    fields: ["sku", "name", "category_id", "unit_cost", "unit_price"],
  },
  {
    id: "categories",
    label: "Product Categories",
    description: "Hierarchical product category taxonomy",
    icon: FolderTree,
    fields: ["id", "name", "parent_id"],
  },
  {
    id: "orders",
    label: "Orders",
    description: "Historical order data with line items",
    icon: ShoppingCart,
    fields: ["id", "account_id", "order_date", "total_amount", "margin_amount"],
  },
];

export default function DataUploads() {
  const [selectedType, setSelectedType] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const { data: uploads, isLoading } = useQuery<DataUpload[]>({
    queryKey: ["/api/data-uploads"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/data-uploads", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-uploads"] });
      setIsDialogOpen(false);
      setSelectedType("");
      setUploadProgress(0);
      toast({
        title: "Upload successful",
        description: "Your data is being processed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && selectedType) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", selectedType);
        setUploadProgress(50);
        uploadMutation.mutate(formData);
      }
    },
    [selectedType, uploadMutation]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file && selectedType) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", selectedType);
        setUploadProgress(50);
        uploadMutation.mutate(formData);
      }
    },
    [selectedType, uploadMutation]
  );

  const columns = [
    {
      key: "uploadType",
      header: "Type",
      cell: (row: DataUpload) => {
        const typeInfo = uploadTypes.find((t) => t.id === row.uploadType);
        const Icon = typeInfo?.icon || FileText;
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{row.uploadType}</span>
          </div>
        );
      },
    },
    {
      key: "fileName",
      header: "File Name",
      cell: (row: DataUpload) => (
        <span className="font-medium">{row.fileName}</span>
      ),
    },
    {
      key: "rowCount",
      header: "Rows",
      cell: (row: DataUpload) => (
        <span>{row.rowCount?.toLocaleString() || "-"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: DataUpload) => {
        const statusConfig: Record<
          string,
          { icon: typeof CheckCircle; className: string }
        > = {
          completed: { icon: CheckCircle, className: "text-chart-2" },
          processing: { icon: Clock, className: "text-chart-3" },
          failed: { icon: XCircle, className: "text-destructive" },
        };
        const config = statusConfig[row.status] || statusConfig.processing;
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${config.className}`} />
            <span className="capitalize">{row.status}</span>
          </div>
        );
      },
    },
    {
      key: "uploadedAt",
      header: "Uploaded",
      cell: (row: DataUpload) => (
        <span className="text-muted-foreground">
          {new Date(row.uploadedAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  // Mock data for demonstration
  const mockUploads: DataUpload[] = [
    {
      id: 1,
      uploadType: "accounts",
      fileName: "accounts_2024.csv",
      rowCount: 487,
      status: "completed",
      errorMessage: null,
      uploadedBy: "Graham",
      uploadedAt: "2024-01-15T10:30:00Z",
    },
    {
      id: 2,
      uploadType: "orders",
      fileName: "orders_q4_2023.csv",
      rowCount: 15234,
      status: "completed",
      errorMessage: null,
      uploadedBy: "Graham",
      uploadedAt: "2024-01-14T09:15:00Z",
    },
    {
      id: 3,
      uploadType: "products",
      fileName: "product_catalog.csv",
      rowCount: 2341,
      status: "completed",
      errorMessage: null,
      uploadedBy: "Graham",
      uploadedAt: "2024-01-10T14:45:00Z",
    },
    {
      id: 4,
      uploadType: "categories",
      fileName: "categories.csv",
      rowCount: 156,
      status: "completed",
      errorMessage: null,
      uploadedBy: "Graham",
      uploadedAt: "2024-01-10T14:30:00Z",
    },
  ];

  const displayUploads = uploads || mockUploads;

  return (
    <div className="p-6 space-y-6" data-testid="page-data-uploads">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Uploads</h1>
          <p className="text-muted-foreground">
            Import and manage your sales data from CSV files
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-data">
              <Upload className="mr-2 h-4 w-4" />
              Upload Data
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Data</DialogTitle>
              <DialogDescription>
                Select the data type and upload a CSV file
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Type</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger data-testid="select-upload-type">
                    <SelectValue placeholder="Select data type" />
                  </SelectTrigger>
                  <SelectContent>
                    {uploadTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedType && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Expected Fields</label>
                  <div className="flex flex-wrap gap-1">
                    {uploadTypes
                      .find((t) => t.id === selectedType)
                      ?.fields.map((field) => (
                        <Badge key={field} variant="secondary" className="text-xs">
                          {field}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25"
                } ${!selectedType && "opacity-50 pointer-events-none"}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  disabled={!selectedType || uploadMutation.isPending}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <span className="text-primary font-medium">Click to upload</span>
                    <span className="text-muted-foreground"> or drag and drop</span>
                  </div>
                  <span className="text-xs text-muted-foreground">CSV files only</span>
                </label>
              </div>

              {uploadMutation.isPending && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {uploadTypes.map((type) => {
          const latestUpload = displayUploads.find((u) => u.uploadType === type.id);
          const tooltips: Record<string, string> = {
            accounts: "Customer account data including segment classification, region, and Territory Manager assignments. This is the foundation for gap analysis.",
            products: "Product catalog with SKUs, categories, and pricing. Used to map orders to categories for penetration analysis.",
            categories: "Product category taxonomy that defines how products are grouped. Categories are used for ICP profile expectations.",
            orders: "Historical order data that powers the gap analysis. Order patterns are compared against ICP profiles to identify opportunities.",
          };
          return (
            <Card key={type.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <type.icon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    {latestUpload?.status === "completed" && (
                      <CheckCircle className="h-4 w-4 text-chart-2" />
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid={`tooltip-upload-${type.id}`}>
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">{tooltips[type.id]}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <CardTitle className="text-base mt-2">{type.label}</CardTitle>
                <CardDescription className="text-xs">
                  {type.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {latestUpload ? (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Last upload: </span>
                    <span>
                      {latestUpload.rowCount?.toLocaleString()} rows
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No data uploaded</span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload History</CardTitle>
        </CardHeader>
        <CardContent>
          {displayUploads.length === 0 ? (
            <EmptyState
              icon={Upload}
              title="No uploads yet"
              description="Upload your first CSV file to get started with account analysis"
              action={{
                label: "Upload Data",
                onClick: () => setIsDialogOpen(true),
              }}
              testId="empty-uploads"
            />
          ) : (
            <DataTable
              columns={columns}
              data={displayUploads}
              isLoading={isLoading}
              testId="table-uploads"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download Templates
          </CardTitle>
          <CardDescription>
            Use these templates to format your data correctly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {uploadTypes.map((type) => (
              <Button
                key={type.id}
                variant="outline"
                className="justify-start"
                data-testid={`button-download-${type.id}-template`}
              >
                <FileText className="mr-2 h-4 w-4" />
                {type.label} Template
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
