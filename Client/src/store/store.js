import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import todoReducer from "./todoSlice";
import expenseReducer from "./expenseSlice";
import folderReducer from "./folderSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    todo: todoReducer,
    expense: expenseReducer,
    folder: folderReducer,
  },
});

export default store;
