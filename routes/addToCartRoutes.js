const express = require("express")
const router = express.Router()

const {
    addToCartService,
    getUserCart,
    deleteCartItem,
    updateCartDetails,
    getCartDetails,
    getCartByPackageId
} = require("../controller/addToCartServiceController")
const { upload, handleUploads } = require("../middleware/upload");
const { authenticationToken } = require("../middleware/authMiddleware")

const multiUpload = upload.any();

router.post("/addtocart", authenticationToken, addToCartService)
router.get('/getcart', authenticationToken, getUserCart);
router.get('/getcartbypackages/:package_id', authenticationToken, getCartByPackageId);

router.get('/getcartdetails/:cart_id', authenticationToken, getCartDetails);
router.patch('/addcartdetails/:cart_id', multiUpload, handleUploads, authenticationToken, updateCartDetails);

router.delete('/deletecart/:cart_id', authenticationToken, deleteCartItem);

module.exports = router;