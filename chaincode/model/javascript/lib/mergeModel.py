import sys,pickle

def main():
    print "Hello from python script"
    firstModel = sys.argv[1]
    secondModel = sys.argv[2]
    with open('/model_pickle','rb') as file1:
        mp1 = pickle.loads(file1.read())
    with open('/model.pickle1','rb') as file2:
        mp2 = pickle.load(file2.read())
    print "Models loaded"
    #merge models by averaging
    #Send the merged model back
    sys.stdout.flush()

#start process
if __name__ == '__main__':
    main()
