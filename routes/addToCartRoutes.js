const express = require("express")
const router = express.Router()

const { addToCartService, getUserCart, checkoutCartService, deleteCartItem } = require("../controller/addToCartServiceController")
const { upload, handleUploads } = require("../middleware/upload");
const { authenticationToken } = require("../middleware/authMiddleware")

const multiUpload = upload.any();

router.post("/addtocart", multiUpload, handleUploads, authenticationToken, addToCartService)
router.post("/checkout/:cart_id", authenticationToken, multiUpload, handleUploads, checkoutCartService)
router.get('/getcart', authenticationToken, getUserCart);
router.delete('/deletecart/:cart_id', authenticationToken, deleteCartItem);

module.exports = router;