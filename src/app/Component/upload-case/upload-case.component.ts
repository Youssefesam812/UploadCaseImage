import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { MessageService, PrimeNGConfig } from 'primeng/api';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { CommonModule } from '@angular/common';
import { CalendarModule } from 'primeng/calendar';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { HttpClientModule } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { HistoryServiceService } from '../../Services/history-service.service';
import { TruncateWordsPipe } from './../../Pipes/truncate-words.pipe';
import { PaginatorModule } from 'primeng/paginator';

interface Visit {
  visitDate: string;
  part: string;
  drNote: string;
  images: string[];
}
@Component({
  selector: 'app-upload-case',
  standalone: true,
  imports: [

  FileUploadModule,
    ButtonModule,
    BadgeModule,
    ProgressBarModule,
    ToastModule,
    CommonModule,
    CalendarModule,
    FormsModule,
    DialogModule,
    HttpClientModule,
    TruncateWordsPipe,
    PaginatorModule
  ],
  templateUrl: './upload-case.component.html',
  styleUrls: ['./upload-case.component.css'],
  providers: [MessageService, DatePipe],
 
})
export class UploadCaseComponent implements OnInit {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;  

  cameraVisible: boolean = false;
  capturedImageFile: File | null = null;
  pendingFiles: any[] = [];
  completedFiles: any[] = [];
  uploadedFiles: any[] = [];

  bodyParts: any[] = [];
  bodyPartFilter: string[] = [];

  selectedDate: Date | null = null;
  name: string = '';
  doctorNotes: string = '';
  isModalOpen = false;
  selectedPart: any = null;
  isSelectionMade: boolean = false;

  visible: boolean = false;
  fileUploadVisible: boolean = false;
  isSubmitted: boolean = false;

  drToken: string = '';
  uploadImageResponse: any = null;

  IdOfSelectedPart: number = 0;

  originalSelectedPart: any = null;

  constructor(
    private messageService: MessageService,
    private datePipe: DatePipe,
    private historyServiceService: HistoryServiceService
  ) { }

  async ngOnInit() {
    this.selectedDate = new Date();
    this.GetDrTokenService();
    this.AllAnatomyService();
  }

  openCameraDialog() {
    this.cameraVisible = true;
    this.startCamera();
  }

  async startCamera() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia is not supported by this browser.');
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.videoElement.nativeElement.srcObject = stream;

      this.videoElement.nativeElement.style.transform = 'scaleX(-1)';
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert(
        'Failed to access the camera. Please ensure you have granted camera permissions.'
      );
    }
  }

  captureImage() {
    const canvas = this.canvasElement.nativeElement;
    const video = this.videoElement.nativeElement;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      context.translate(canvas.width, 0);
      context.scale(-1, 1);

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      context.setTransform(1, 0, 0, 1, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const timestamp = new Date().toISOString().replace(/:/g, '-');
          const fileName = `captured-image-${timestamp}.png`;

          const file = new File([blob], fileName, { type: 'image/png' });

          const fileWithProgress = {
            file,
            name: file.name,
            size: file.size,
            objectURL: URL.createObjectURL(file),
            progress: 100,
          };

          this.uploadedFiles.push(fileWithProgress);

          this.submitFiles();

          this.visible = false;
          console.log(this.uploadedFiles);
        }
      });
    }

    this.stopCamera();
    this.cameraVisible = false;
  }

  stopCamera() {
    const stream = this.videoElement.nativeElement.srcObject as MediaStream;
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();

    if (event.dataTransfer && event.dataTransfer.files) {
      const files = event.dataTransfer.files;
      const customEvent = {
        target: {
          files: files,
        } as HTMLInputElement
      } as unknown as Event;

      this.onSelectedFiles(customEvent);
    }
  }

  GetDrTokenService(): void {
    const requestPayload = { phone: '1111' };
    this.historyServiceService.GetDrToken(requestPayload).subscribe(
      (res) => {
        this.drToken = res.data;
      },
      (error) => {
        console.error('Error fetching dr Token:', error);
      }
    );
  }

  AllAnatomyService() {
    this.historyServiceService.GetAllAnatomy().subscribe((res) => {
      this.bodyParts = res.data;
      console.log(this.bodyParts);

      this.bodyPartFilter = this.bodyParts.map((part) => part.name);
    });
  }
  openUploadDialog(event: Event) {
    event.preventDefault();
    this.visible = true;
  }

  openFileUploadDialog() {
    this.visible = false;
    this.fileUploadVisible = true;
  }
  closeFileUploadDialog() {
    this.fileUploadVisible = false;
  }
  onSelectedFiles(event: Event) {
    const inputEvent = event as InputEvent;
    const target = inputEvent.target as HTMLInputElement;
  
    if (target.files) {
      const files = Array.from(target.files);
      const maxSizeInMB = 3; // Maximum file size in MB
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
      const totalFilesCount = this.pendingFiles.length + files.length;
  
      if (totalFilesCount > 6) {
        const allowedFiles = 6 - this.pendingFiles.length;
        const validFiles = files.slice(0, allowedFiles);
  
        for (let file of validFiles) {
          if (file.size > maxSizeInBytes) {
            this.messageService.add({
              severity: 'warn',
              summary: 'File Size Exceeded',
              detail: `${file.name} exceeds the maximum file size of ${maxSizeInMB} MB.`,
            });
            continue;
          }
  
          if (this.completedFiles.some((f) => f.name === file.name)) {
            continue;
          }
  
          const fileWithProgress = {
            file,
            name: file.name,
            size: file.size,
            objectURL: URL.createObjectURL(file),
            progress: 0,
          };
          this.pendingFiles.push(fileWithProgress);
          this.simulateUpload(fileWithProgress);
        }
  
        this.messageService.add({
          severity: 'warn',
          summary: 'File Limit Exceeded',
          detail: `You can upload a maximum of 6 images. Only the first ${validFiles.length} files were added.`,
        });
      } else {
        for (let file of files) {
          if (file.size > maxSizeInBytes) {
            this.messageService.add({
              severity: 'warn',
              summary: 'File Size Exceeded',
              detail: `${file.name} exceeds the maximum file size of ${maxSizeInMB} MB.`,
            });
            continue;
          }
  
          if (this.completedFiles.some((f) => f.name === file.name)) {
            continue;
          }
  
          const fileWithProgress = {
            file,
            name: file.name,
            size: file.size,
            objectURL: URL.createObjectURL(file),
            progress: 0,
          };
          this.pendingFiles.push(fileWithProgress);
  
          this.simulateUpload(fileWithProgress);
        }
      }
      target.value = '';
    }
  }

  simulateUpload(file: any) {
    const interval = setInterval(() => {
      if (file.progress < 100) {
        file.progress += 10;
      } else {
        clearInterval(interval);
        this.moveToCompleted(file);
      }
    }, 500);
  }

  moveToCompleted(file: any) {
    const index = this.pendingFiles.indexOf(file);
    if (index !== -1) {
      this.pendingFiles.splice(index, 1);
      this.completedFiles.push(file);
    }
  }

  removeImage(index: number) {
    if (this.uploadedFiles[index] === this.selectedImage) {
      if (this.uploadedFiles.length > 1) {
        this.selectedImage =
          this.uploadedFiles[index + 1] || this.uploadedFiles[index - 1];
      } else {
        this.selectedImage = null;
      }
    }
    this.uploadedFiles.splice(index, 1);
  }

  onRemoveCompletedFile(index: number) {
    this.completedFiles.splice(index, 1);
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  formatSize(bytes: number): string {
    const k = 1024;
    const mb = 1024 * 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return `0 ${sizes[0]}`;

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const formattedSize = parseFloat((bytes / mb).toFixed(dm));

    return `${formattedSize} MB`;
  }

  submitFiles() {
    const totalFiles = this.uploadedFiles.length + this.completedFiles.length;

    if (totalFiles > 6) {
      this.messageService.add({
        severity: 'error',
        summary: 'File Limit Exceeded',
        detail: 'You can upload a maximum of 6 images.',
      });
    } else {
      const combinedFiles = [...this.uploadedFiles, ...this.completedFiles];

      const fileNames = combinedFiles.map((f) => f.file.name);
      const duplicates = combinedFiles.filter(
        (file, index) => fileNames.indexOf(file.file.name) !== index
      );

      if (duplicates.length > 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Duplicate Images Detected',
          detail: `The following images are duplicates and will not be uploaded again: ${Array.from(
            new Set(duplicates.map((f) => f.file.name))
          ).join(', ')}`,
        });
      }
      const uniqueFiles = combinedFiles.reduce((unique, file) => {
        if (
          !unique.some(
            (f: { file: { name: any } }) => f.file.name === file.file.name
          )
        ) {
          unique.push(file);
        }
        return unique;
      }, [] as any[]);

      this.uploadedFiles = uniqueFiles;

      console.log(this.uploadedFiles);
      this.completedFiles = [];
      this.isSubmitted = true;
      this.closeFileUploadDialog();
    }
  }

  onRemoveTemplatingFile(event: Event, file: any, index: number) {
    event.preventDefault();

    // Release the object URL to avoid memory leaks
    if (file.objectURL) {
      URL.revokeObjectURL(file.objectURL);
    }

    // Remove the file from the pendingFiles array
    this.pendingFiles.splice(index, 1);

    // Clear the file input value to allow re-selection of the same file
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  limitFileName(fileName: string): string {
    const words = fileName.split(' ');
    if (words.length > 5) {
      return words.slice(0, 5).join(' ') + '...';
    }
    return fileName;
  }

  openModal() {
    this.isModalOpen = true;
    if (!this.isSelectionMade) {
      this.selectedPart = this.originalSelectedPart;
    }
  }

  closeModal() {
    this.isModalOpen = false;
    if (!this.isSelectionMade) {
      this.selectedPart = this.originalSelectedPart;
    }
    this.selectedPart = this.originalSelectedPart;
    // this.isSelectionMade = false;
  }

  selectBodyPart(part: any) {
    this.selectedPart = part;
    this.IdOfSelectedPart = part.id;
    console.log('id of selected part : ', this.IdOfSelectedPart)
  }

  submitSelection() {
    if (this.selectedPart) {
      this.name = this.selectedPart.name;
      this.isSelectionMade = true;
      this.originalSelectedPart = this.selectedPart;
      // this.closeModal();
      this.isModalOpen = false;

    }
    console.log('id of selected part : ', this.IdOfSelectedPart);
  }
  getSelectionText() {
    return this.isSelectionMade ? 'Change' : 'Select';
  }

  selectedImage: any = null;
  SelectedImageFunction(file: any) {
    this.selectedImage = file;
  }
  //----------------------------------------------------------------------//
  isLoading: boolean = false;
  

  PostPatientCaseFunctionFromService() {
    if (this.uploadedFiles.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Upload Required',
        detail: 'Please upload at least one image before submitting.',
        life: 5000,
      });
      return;
    }

    if (this.IdOfSelectedPart === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Selection Required',
        detail: 'Please select a part before submitting the case.',
        life: 5000,
      });
      return;
    }

    this.isLoading = true; 
   
    const formData = new FormData();
    this.uploadedFiles.forEach((fileObj: any) => {
      const file = fileObj.file;
      formData.append('files', file, file.name);
    });

    this.historyServiceService.PostImagesFunction(formData).subscribe(
      (res) => {
        this.uploadImageResponse = res.data;
        console.log('upload images from uploadImageResponse: ', this.uploadImageResponse);

        const formattedDate = this.datePipe.transform(this.selectedDate, 'yyyy-MM-ddTHH:mm:ss.SSS') || '';
        const data = {
          note: this.doctorNotes,
          visitDate: formattedDate,
          anatomyId: this.IdOfSelectedPart,
          patientId: 1,
          caseImages: this.uploadImageResponse,
        };

        if (this.drToken) {
          this.historyServiceService.PostPatientCaseFunction(data, this.drToken).subscribe(
            (res) => {
              console.log('response SENDING ALL DATA: ', res);

              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Case added successfully!',
                life: 5000,
              });
              this.doctorNotes = '';
              this.selectedDate = new Date();
              this.uploadedFiles = [];
              this.IdOfSelectedPart = 0;
              this.selectedPart = null;
              this.name = '';
              this.originalSelectedPart = null;
              this.isSelectionMade=false

              this.fetchHistory();
            },
            (error) => {
              console.error('Error occurred:', error);

              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'An error occurred while submitting the case.',
                life: 5000,
              });
            }
          ).add(() => {
            this.isLoading = false; 
          });
        } else {
          console.error('drToken is missing or invalid');
          this.isLoading = false;
        }
      },
      (error) => {
        console.error('Error occurred during image upload:', error);
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error.errorList.map((item: any) => item.message).join('\n'),
          life: 5000,
        });
        this.isLoading = false; 
      }
    );
  }

  //---------------------------------------------------------------------//
  //view history
  isHistoryVisible: boolean = false;

  toggleHistory(): void {
    this.first=0;
    this.isHistoryVisible = !this.isHistoryVisible;

    if (this.isHistoryVisible) {
      this.filteredVisits = [...this.patientVisits];
      this.selectedVisit = null;  
      this.isDetailsVisible = false; 
    }
    this.fetchHistory();
  }
  //filters and views

  // Filter states
  isDetailsVisible: boolean = false;
  showCalend: boolean = false;
  selectedBodyParts: string[] = [];
  selectedBodyPartsId: number[] = [];
  selectedDateFilter: Date | null = null;
  selectedDateFilterShape: string | null = null;
  isBodyPartSelected: boolean = false;
  isDateSelected: boolean = false;
  isFilterSelected: boolean = false;
  clearButton: boolean = false;
  tempSelectedBodyParts: string[] = [];

  isLoadingHistory: boolean = false;
  // Body parts
  patientVisits: Visit[] = [];
  filteredVisits: Visit[] = [...this.patientVisits];


  first = 0;
  rows = 10;
  totalRecords = 0;

  
  async fetchHistory(pageNumber: number = 1, pageSize: number = this.rows, anatomyString?: any, DateString?: any) {
    this.isLoadingHistory = true; 
  
    this.historyServiceService.getAllCases(pageNumber, pageSize, anatomyString, DateString).subscribe(
      (response) => {
        this.isLoadingHistory = false; 
  
        if (response && response.data) {
          const fetchedVisits = response.data.items.map((visit: any) => ({
            visitDate: new Date(visit.visitDate), 
            part: visit.anatomyName,
            drNote: visit.note,
            images: visit.caseImages.map((image: any) => image.imagePath),
          }));
  
          console.log("response pages : " , response);
          
          this.patientVisits = fetchedVisits;
          this.filteredVisits = [...this.patientVisits];
          this.totalRecords = response.data.totalRecords; 
          
          this.isZoomed = false;
          this.zoomedVisit = null;
          this.zoomedVisitIndex = null;
        }
      },
      (error) => {
        this.isLoadingHistory = false; 
        console.error('Error fetching history:', error);
      }
    );
  }
  
  onPageChange(event: any) {
    this.first = event.first;
    this.rows = event.rows;
    const pageNumber = event.page + 1; 
    this.CallApiApplyFilters();
  }
  

  toggleFilter(): void {
    this.isDetailsVisible = !this.isDetailsVisible;
    if (this.isDetailsVisible) {
      this.showCalend = false;
    }
  //   if (!this.isDetailsVisible) {
  //     this.clickApplyFilterButton();
  // }
}

  toggleCalendar(): void {
    this.showCalend = !this.showCalend;
    if (this.showCalend) {
      this.isDetailsVisible = false;
    }
  }

  onDateChange(date: Date) {
    this.selectedDateFilter = date;
    this.selectedDateFilterShape = this.datePipe.transform(date, 'dd/MM/yyyy') || '';
    this.isDateSelected = true;
    this.isFilterSelected = true;
    this.clearButton = true;
    this.showCalend = false;
  }

  clearFilters() {
    this.selectedBodyParts = [];
    this.selectedDateFilter = null;
    this.selectedDateFilterShape = null;
    this.isBodyPartSelected = false;
    this.isDateSelected = false;
    this.isFilterSelected = false;
    this.clearButton = false;
    this.tempSelectedBodyParts = [];

    this.filteredVisits = [];

   this.fetchHistory()
  }

  clearDateFilter() {
    this.selectedDateFilter = null;
    this.selectedDateFilterShape = null;
    this.isDateSelected = false; 
    if(this.selectedBodyParts.length === 0 && this.tempSelectedBodyParts.length === 0){
      this.clearFilters()
    }
  }

  removeBodyPart(part: string) {
    const index = this.selectedBodyParts.indexOf(part);
    if (index >= 0) {
      this.selectedBodyParts.splice(index, 1);
      this.tempSelectedBodyParts.splice(this.tempSelectedBodyParts.indexOf(part), 1);
       if (this.selectedBodyParts.length === 0 && this.tempSelectedBodyParts.length === 0 &&   this.isDateSelected == false) {
        this.isFilterSelected = false;
           this.clearFilters()
          }
    }
  }

  onBodyPartClick(part: string) {
    const index = this.tempSelectedBodyParts.indexOf(part);
    if (index >= 0) {
      this.tempSelectedBodyParts.splice(index, 1);
    } else {
      this.tempSelectedBodyParts.push(part);
    }
  }

  clickApplyFilterButton() {
    
    if (this.tempSelectedBodyParts.length === 0 && !this.selectedDateFilter) {
      return; 
    }
  
    this.selectedBodyParts = [...this.tempSelectedBodyParts];
    this.isFilterSelected = true;
    this.isBodyPartSelected = this.selectedBodyParts.length > 0;
  
    if (this.selectedDateFilter) {
      this.isDateSelected = true;
    }
  
    this.isDetailsVisible = false;
    this.clearButton = true;
  }

  CallApiApplyFilters() {
    const pageNumber = Math.floor(this.first / this.rows) + 1;
    this.applyFilters(pageNumber, this.rows);
  }

  applyFilters(pageNumber: number, pageSize: number) {
    // Format the selected date if provided
    const selectedDateFormatted = this.selectedDateFilter
      ? this.datePipe.transform(new Date(this.selectedDateFilter), 'yyyy-MM-ddTHH:mm:ss')
      : null;
  
    // Filter and map selected body parts to their IDs
    const anatomyString = this.bodyParts
      .filter(part => this.selectedBodyParts.includes(part.name))
      .map(part => part.id)
      .join(',');
  
    // Reset the filtered visits array
    this.filteredVisits = [];
  
    // Call the API with the filtered parameters and current pagination values
    console.log(anatomyString,selectedDateFormatted);
    
    this.fetchHistory(pageNumber, pageSize, anatomyString, selectedDateFormatted);
  }
  
  getUploadedFilesForVisit(visit: any) {
    const files = visit.images.map((image: string) => ({
      objectURL: this.getImageUrl(image),
      fileName: image
    })) || [];
    return files;
  }

  getImageUrl(imageName: string): string {
    const url = `http://ec2-34-250-251-119.eu-west-1.compute.amazonaws.com/${imageName}`;
    return url;
  }
  //------------------------------------------------------------------
  //zoomed image
  isZoomed: boolean = false;
  zoomedImageSrc: string | null = null;
  zoomedVisit: any = null;
  zoomedVisitIndex: number | null = null;
  hoveredVisitIndex: number | null = null;
  preventHide: boolean = false;

  isOdd(index: number | null): boolean {
    return index !== null && index % 2 !== 0;
  }

  showZoomedImage(imageSrc: string | undefined, visit: any, index: number): void {
    this.preventHide = true;
    this.zoomedImageSrc = imageSrc ?? null;
    this.isZoomed = !!this.zoomedImageSrc;
    this.zoomedVisit = visit;
    this.zoomedVisitIndex = index;

    setTimeout(() => {
      this.preventHide = false;
    }, 10);
  }

  hideZoomedImage(): void {
    if (!this.preventHide) {
      this.isZoomed = false;
      this.zoomedImageSrc = null;
      this.zoomedVisit = null;
      this.zoomedVisitIndex = null;
    }
  }

  //---------------------------------------------------------------
  selectedVisit: any = null;
  currentImageSrc: string = '';
  isIconHovered: boolean = false;

  selectVisit(visit: any): void {
    this.selectedVisit = visit;
    // Set the first image as the default main image
    const images = this.getUploadedFilesForVisit(visit);
    if (images.length > 0) {
      this.currentImageSrc = images[0].objectURL;
    }
    if (this.isDetailsVisible) {
      this.isDetailsVisible = false;
    }
    if (this.showCalend) {
      this.showCalend = false;
    }
  }

  updateMainImage(imageSrc: string): void {
    this.currentImageSrc = imageSrc;
  }

  clearSelectedVisit(): void {
    this.selectedVisit = null;
    this.currentImageSrc = ''; // Reset the main image
  }

  // details zoom
  onIconHover(): void {
    this.isIconHovered = true;
  }
  
  onIconLeave(): void {
    this.isIconHovered = false;
  }
  //--------------------------------------------------------------------- */
  formatDate(date: string): string {
    const dateObj = new Date(date);
    const day = ('0' + dateObj.getDate()).slice(-2);
    const month = ('0' + (dateObj.getMonth() + 1)).slice(-2);
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  }
}