<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\EventsController;
use App\Http\Controllers\HotmartController;

Route::get('/', function () {
    return view('welcome');
});

Route::post('/events/send', [EventsController::class, 'send']);
Route::post('/webhook/hotmart', [HotmartController::class, 'Hotmart']);

Route::middleware(['auth:sanctum'])->group(function () {
});

Route::middleware('auth:sanctum')->prefix('api')->group(function () {
    
});