import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import todoReducer from "./todoSlice";
import expenseReducer from "./expenseSlice";
import folderReducer from "./folderSlice";
import fileReducer from "./fileSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    todo: todoReducer,
    expense: expenseReducer,
    folder: folderReducer,
    file: fileReducer,
  },
});

export default store;
