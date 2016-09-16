# def do_every (interval, worker_func, iterations, t):
#     if iterations != 0:
#         threading.Timer (
#             interval,
#             do_every, [interval, worker_func, iterations-1, datetime.now()]
#         ).start ()

#         worker_func(t)

# def print_hw ():
#     print "hello"

# t = threading.Timer(1, print_hw)

# t.start()

a = []
a.append([1,2])
a.append([2,2])
a.append([3,2])
a.append([4,2])

print a

a.pop()
a.pop()

print a