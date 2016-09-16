import threading, time

from datetime import datetime

def do_every (interval, worker_func, iterations, t):
    if iterations != 0:
        threading.Timer (
            interval,
            do_every, [interval, worker_func, iterations-1, datetime.now()]
        ).start ()

        worker_func(t)

def print_hw (t):
    print (datetime.now() - t).total_seconds() * 1000

def print_so ():
    print "test = " , test
    c = 0
    for i in range(10000):
        c = i
    print c

do_every (0.0005, print_hw, 5, datetime.now())
