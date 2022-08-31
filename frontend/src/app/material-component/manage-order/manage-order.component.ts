import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { BillService } from 'src/app/services/bill.service';
import { CategoryService } from 'src/app/services/category.service';
import { ProductService } from 'src/app/services/product.service';
import { SnackbarService } from 'src/app/services/snackbar.service';
import { GlobalConstants } from 'src/app/shared/global-constants';
import { saveAs} from 'file-saver';

@Component({
  selector: 'app-manage-order',
  templateUrl: './manage-order.component.html',
  styleUrls: ['./manage-order.component.scss']
})
export class ManageOrderComponent implements OnInit {

  displayedColumns: string[] = ['name','category','price','quantity','total','edit']
  dataSource:any = [];
  manageOderForm:any = FormGroup;
  categorys: any = []
  products: any = [];
  price: any ;
  totalAmount: number = 0;


  responseMessage:any ;

  constructor(private formBuilder:FormBuilder,
    private categoryService:CategoryService,
    private productService:ProductService,
    private snackbarService:SnackbarService,
    private billService: BillService,
    private ngxService: NgxUiLoaderService
    ) { }

  ngOnInit(): void {
    this.ngxService.start();
    this.getCategorys();
    this.manageOderForm = this.formBuilder.group ({
      name: [null, [Validators.required, Validators.pattern(GlobalConstants.nameRegex) ]],
      email: [null, [Validators.required, Validators.pattern(GlobalConstants.emailRegex) ]],
      contactNumber: [null, [Validators.required, Validators.pattern(GlobalConstants.contactNumberRegex) ]],
      paymentMethod: [null, Validators.required],
      product: [null, Validators.required],
      category: [null, Validators.required],
      price: [null, Validators.required],
      quantity: [null, Validators.required],
      total: [0, Validators.required],
      
    })
  }


  getCategorys() {
    this.categoryService.getCategories().subscribe((response:any) => {
      this.ngxService.stop();
      this.categorys = response;
    }, (error: any)=> {
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

  getProductsByCategorys(value:any) {
    this.productService.getProductsByCategory(value.id).subscribe((response:any) => {     
      this.products = response;
      this.manageOderForm.controls['price'].setValue(''); //reset price
      this.manageOderForm.controls['quantity'].setValue('');//remove quantity
      this.manageOderForm.controls['total'].setValue(0);//reset total
    }, (error: any)=> {
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

  getProductDetails(value:any) {
    this.productService.getById(value.id).subscribe((response:any) => {
     this.price = response.price;
     this.manageOderForm.controls['price'].setValue(response.price); 
     this.manageOderForm.controls['quantity'].setValue('1');
     this.manageOderForm.controls['total'].setValue(this.price*1);      
    }, (error: any)=> {
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

  setQuantity(value:any) {
    var temp = this.manageOderForm.controls['quantity'].value;
    if (temp > 0 ) {
      this.manageOderForm.controls['total'].setValue(this.manageOderForm.controls['quantity'].value *
      this.manageOderForm.controls['price'].value)
    } else if (temp != '') {
      this.manageOderForm.controls['quantity'].setValue(1);
      this.manageOderForm.controls['total'].setValue(this.manageOderForm.controls['quantity'].value *
      this.manageOderForm.controls['price'].value)

    }
  }

  validateProductAdd() {
     if( this.manageOderForm.controls['total'].value === 0 || 
        this.manageOderForm.controls['total'].value === null || this.manageOderForm.controls['quantity'].value <= 0 )
      return true;
     else
      return false 
  }


  //below is to disable submit button.
  validateSubmit() {
    if (  this.totalAmount === 0 || this.manageOderForm.controls['name'].value === null ||
          this.manageOderForm.controls['email'].value === null ||
          this.manageOderForm.controls['contactNumber'].value === null ||
          this.manageOderForm.controls['paymentMethod'].value === null ||
          !(this.manageOderForm.controls['contactNumber'].valid) 
          || !(this.manageOderForm.controls['email'].valid) 
    ) {
      return true
    } else 
    { return false }
     
  }

  add() {
    var formData = this.manageOderForm.value;
    var productName = this.dataSource.find((e:{id:number;})=>e.id == formData.product.id)
    if (productName === undefined){
      this.totalAmount = this.totalAmount + formData.total;
      this.dataSource.push({
        id:formData.product.id,
        name:formData.product.name,
        category:formData.category.name,
        quantity:formData.quantity,
        price:formData.price,
        total:formData.total
      });
      this.dataSource = [...this.dataSource];
      this.snackbarService.openSnackBar(GlobalConstants.productAdded, "success")
    }
    else {
      this.snackbarService.openSnackBar(GlobalConstants.productExistError, GlobalConstants.error)
    }
  }

  handleDeleteAction (value:any, element:any) {
    this.totalAmount = this.totalAmount - element.total;
    this.dataSource.splice(value, 1);
    this.dataSource = [...this.dataSource]
  }

  submitAction() {
    this.ngxService.start()
    var formData = this.manageOderForm.value;
    var data = {
      name: formData.name,
      email: formData.email,
      contactNumber: formData.contactNumber,
      paymentMethod: formData.paymentMethod,
      totalAmount: this.totalAmount,
      productDetails : JSON.stringify(this.dataSource)
    }

    console.log(data);
    this.billService.generateReport(data).subscribe((response:any)=> {
      this.downloadFile(response?.uuid);
      this.manageOderForm.reset();
      this.dataSource = [];
      this.totalAmount = 0;

    }, (error: any)=> {
      this.ngxService.stop();
      console.log(error);
      if(error.error?.message) {
        this.responseMessage = error.error?.message;
      } else {
        this.responseMessage = GlobalConstants.genericError;
      }
      this.snackbarService.openSnackBar(this.responseMessage, GlobalConstants.error)      
    }
    )
  }

  downloadFile(fileName:any) {
    var data = {
      uuid:fileName
    }
    this.billService.generatePDF(data).subscribe((response:any)=> {
      saveAs(response, fileName + '.pdf')
      this.ngxService.stop();
    })

  }

}
