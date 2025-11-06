const express = require("express")
const router = express.Router()

const {
    addToCartService,
    getUserCart,
    deleteCartItem,
    updateCartDetails,
    getCartDetails,
    getCartByServiceTypeId,
    deleteCartSubPackage,
    getAdminInquiries,
    updateCartItemQuantity,
    getUserCartCount
} = require("../controller/addToCartServiceController")
const { upload, handleUploads } = require("../middleware/upload");
const { authenticationToken } = require("../middleware/authMiddleware")

const multiUpload = upload.any();

router.post("/addtocart", authenticationToken, addToCartService)
router.get('/getcart', authenticationToken, getUserCart);
router.get('/getinquiries', authenticationToken, getAdminInquiries);
router.get('/getcartbyservicetypeid/:service_type_id', authenticationToken, getCartByServiceTypeId);
router.get('/get-cart-count', authenticationToken, getUserCartCount);
router.post('/updatequantity/:cart_package_items_id', authenticationToken, updateCartItemQuantity);
router.get('/getcartdetails/:cart_id', authenticationToken, getCartDetails);
router.patch('/addcartdetails/:cart_id', multiUpload, handleUploads, authenticationToken, updateCartDetails);
router.delete('/deletecart/:cart_id', authenticationToken, deleteCartItem);
router.delete('/deletesubpackage/:cart_id', authenticationToken, deleteCartSubPackage);

module.exports = router;    
