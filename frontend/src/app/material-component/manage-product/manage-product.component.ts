import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { ProductService } from 'src/app/services/product.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { GlobalConstants } from 'src/app/shared/global-constants';
import { ConfirmationComponent } from '../dialog/confirmation/confirmation.component';
import { ProductComponent } from '../dialog/product/product.component';

@Component({
  selector: 'app-manage-product',
  templateUrl: './manage-product.component.html',
  styleUrls: ['./manage-product.component.scss']
})
export class ManageProductComponent implements OnInit {

  displayedColumns:string[]=['name', 'category', 'description', 'price', 'edit' ]
  dataSource: any;
  responseMessage:any;

  constructor(
    private productService:ProductService,
    private ngxService:NgxUiLoaderService,
    private dialog:MatDialog,
    private snackbarService:SnackbarService,
    private router:Router
  ) { }

  ngOnInit(): void {
    this.ngxService.start();
    this.tableData();    
  }

  tableData() {
    this.productService.getProducts().subscribe((response:any)=> {
      this.ngxService.stop();
      this.dataSource = new MatTableDataSource(response);
    }, (error:any)=> {
      this.ngxService.stop();
      console.log(error);
      if(error.error?.message) {
        this.responseMessage = error.error?.message;
      } else {
        this.responseMessage = GlobalConstants.genericError;
      }
      this.snackbarService.openSnackBar(this.responseMessage, GlobalConstants.error)
    } )
  }

  applyFilter(event:Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }    

  handleAddAction() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = {
      action: 'Add'
    }
    dialogConfig.width = "850px";
    const dialogRef = this.dialog.open(ProductComponent, dialogConfig)
    //we also want to subscribe to route /product , for 401 it will go to loginpage, 
    // model will not close
    //To close the model we have to write following
    this.router.events.subscribe(()=> {
      dialogRef.close()
    })
    //code will call this.onAddCategory.emit() , in that case we have to refresh our table
    //for that we have to write the code.
    const sub = dialogRef.componentInstance.onAddProduct.subscribe(
      (response)=>{
        this.tableData();
      }
    )
  }

  handleEditAction(value:any) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = {
      action: 'Edit',
      data: value
    }
    dialogConfig.width = "850px";
    const dialogRef = this.dialog.open(ProductComponent, dialogConfig)
    this.router.events.subscribe(()=> {
      dialogRef.close()
    })
    const sub = dialogRef.componentInstance.onEditProduct.subscribe(
      (response)=>{
        this.tableData();
      }
    )
  }

  handleDeleteAction(value:any) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = {
      message: 'delete ' +value.name + ' product'
    }
    const dialogRef = this.dialog.open(ConfirmationComponent, dialogConfig);
    const sub = dialogRef.componentInstance.onEmitStatusChange.subscribe((response)=> {
      this.ngxService.start();
      this.deleteProduct(value.id);
      dialogRef.close();
    })
  }


  deleteProduct(id: any) {
    this.productService.delete(id).subscribe((response:any) => {
      this.ngxService.stop();
      this.tableData();
      this.responseMessage = response?.message;
      this.snackbarService.openSnackBar(this.responseMessage, "success");
    },  (error:any)=> {
      this.ngxService.stop();
      console.log(error);
      if(error.error?.message) {
        this.responseMessage = error.error?.message;
      } else {
        this.responseMessage = GlobalConstants.genericError;
      }
      this.snackbarService.openSnackBar(this.responseMessage, GlobalConstants.error)
    } )
  }

  onChange(status:any, id:any) {
    var data = {
      status: status.toString(), // convert to toString 1st
      id:id
    }
    this.productService.updateStatus(data).subscribe((response:any)=> {
      this.ngxService.stop();
      this.responseMessage = response?.message;
      this.snackbarService.openSnackBar(this.responseMessage, "success");      
    },(error:any)=> {
      this.ngxService.stop();
      console.log(error);
      if(error.error?.message) {
        this.responseMessage = error.error?.message;
      } else {
        this.responseMessage = GlobalConstants.genericError;
      }
      this.snackbarService.openSnackBar(this.responseMessage, GlobalConstants.error)
    })
  }
  
}
